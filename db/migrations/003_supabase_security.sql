-- Fresh Supabase environments only. Existing local legacy databases are never migrated automatically.
-- Applied by scripts/migrate.mjs; this is the sole application migration history.
do $$ begin
  if exists(select 1 from public.users) then
    raise exception 'Fresh-install migration refused: users already exist; use an explicitly reviewed data migration.';
  end if;
end $$;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='stylingu_api') then create role stylingu_api nologin nosuperuser nobypassrls; end if;
  if not exists(select 1 from pg_roles where rolname='stylingu_jobs') then create role stylingu_jobs nologin nosuperuser nobypassrls; end if;
end $$;
grant usage on schema public, private, auth to stylingu_api, stylingu_jobs;
grant execute on function auth.uid(), auth.jwt() to stylingu_api, stylingu_jobs;
alter table public.users drop column password_hash;
alter table public.users alter column id drop default;
alter table public.users add constraint users_auth_fk foreign key(id) references auth.users(id) on delete cascade;
drop table public.sessions;
drop table public.reset_tokens;

create function private.provision_user() returns trigger language plpgsql security definer set search_path='' as $$
declare birth date; display_name text;
begin
  birth := (new.raw_user_meta_data->>'birth_date')::date;
  if birth is null or birth > (current_date - interval '16 years')::date or birth < date '1900-01-01' then raise exception 'Birth date must satisfy the minimum age of 16'; end if;
  display_name := left(trim(new.raw_user_meta_data->>'name'),60);
  if display_name is null or display_name='' then raise exception 'Name is required'; end if;
  insert into public.users(id,name,email,birth_date) values(new.id,display_name,new.email,birth);
  return new;
end $$;
revoke all on function private.provision_user() from public, anon, authenticated;
create trigger provision_stylingu_user after insert on auth.users for each row execute function private.provision_user();

-- Verify the session, not just a still-unexpired JWT after global logout.
create function private.session_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.sessions s where s.id::text = auth.jwt()->>'session_id' and s.user_id=auth.uid());
$$;
revoke all on function private.session_active() from public;
grant execute on function private.session_active() to stylingu_api, authenticated;
grant usage on schema private to authenticated;

do $$ declare t text; column_name text; begin
  foreach t in array array['users','photos','outfits','garments','outfit_plans','owned_cosmetics','recommendation_feedback','tutorial_progress','analysis_jobs','quotas'] loop
    column_name := case when t='users' then 'id' else 'user_id' end;
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('create policy own_rows on public.%I to stylingu_api using (%I=(select auth.uid()) and (select private.session_active())) with check (%I=(select auth.uid()) and (select private.session_active()))',t,column_name,column_name);
    execute format('grant select on public.%I to stylingu_api',t);
  end loop;
  foreach t in array array['products','product_variants','product_offers'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('create policy catalog_read on public.%I for select to stylingu_api, stylingu_jobs using (true)',t);
    execute format('grant select on public.%I to stylingu_api, stylingu_jobs',t);
  end loop;
end $$;
grant insert, update, delete on public.photos, public.outfits, public.garments, public.outfit_plans, public.owned_cosmetics, public.recommendation_feedback, public.tutorial_progress, public.analysis_jobs, public.quotas to stylingu_api;
grant update(preferences,analysis,photo_input,profile,deleting,updated_at) on public.users to stylingu_api;
alter table public.schema_migrations enable row level security;
revoke all on public.schema_migrations from public, anon, authenticated, stylingu_api, stylingu_jobs;

-- Background worker: table-specific operations and identity scope, no ownership or BYPASSRLS.
grant select on public.users, public.photos, public.analysis_jobs to stylingu_jobs;
grant update(analysis,updated_at) on public.users to stylingu_jobs;
grant update(state,result,error,finished_at) on public.analysis_jobs to stylingu_jobs;
create policy jobs_users on public.users for select to stylingu_jobs using(id=(select auth.uid()));
create policy jobs_analysis on public.users for update to stylingu_jobs using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy jobs_photos on public.photos for select to stylingu_jobs using(user_id=(select auth.uid()));
create policy jobs_results on public.analysis_jobs to stylingu_jobs using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Deliberate privileged queue operations; callable only by the internal job role.
create function private.claim_analysis_job() returns setof public.analysis_jobs language sql security definer set search_path='' as $$
 update public.analysis_jobs set state='processing',started_at=now() where id=(
  select id from public.analysis_jobs where state='queued' order by created_at limit 1 for update skip locked
 ) returning *;
$$;
create function private.expire_analysis_jobs(cutoff timestamptz) returns void language sql security definer set search_path='' as $$
 update public.analysis_jobs set state='uncertain',finished_at=now(),error='{"code":"EXECUTION_UNCERTAIN","message":"Comprueba el resultado antes de solicitar otro análisis."}'::jsonb
 where state='processing' and started_at<cutoff;
$$;
revoke all on function private.claim_analysis_job(), private.expire_analysis_jobs(timestamptz) from public, anon, authenticated, stylingu_api;
grant execute on function private.claim_analysis_job(), private.expire_analysis_jobs(timestamptz) to stylingu_jobs;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('stylingu-photos','stylingu-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy stylingu_photo_read on storage.objects for select to authenticated
 using(bucket_id='stylingu-photos' and split_part(name,'/',1)=(select auth.uid())::text and (select private.session_active()));
create policy stylingu_photo_add on storage.objects for insert to authenticated
 with check(bucket_id='stylingu-photos' and split_part(name,'/',1)=(select auth.uid())::text and (select private.session_active()));
create policy stylingu_photo_edit on storage.objects for update to authenticated
 using(bucket_id='stylingu-photos' and split_part(name,'/',1)=(select auth.uid())::text and (select private.session_active()))
 with check(bucket_id='stylingu-photos' and split_part(name,'/',1)=(select auth.uid())::text and (select private.session_active()));
create policy stylingu_photo_delete on storage.objects for delete to authenticated
 using(bucket_id='stylingu-photos' and split_part(name,'/',1)=(select auth.uid())::text and (select private.session_active()));

-- Only the isolated rotation runner can use this metadata; values never contain credentials.
create table private.credential_rotations (
 environment text not null check(environment in ('staging','production')),
 provider text not null check(provider in ('supabase','cloudflare','database')),
 state jsonb not null,
 updated_at timestamptz not null default now(),
 primary key(environment,provider)
);
revoke all on private.credential_rotations from public,anon,authenticated,stylingu_api,stylingu_jobs;
