-- A rotation runner can change only the four known runtime login passwords.
-- It cannot grant roles, alter unrelated accounts, or read private user data.
do $$ begin
 if not exists(select 1 from pg_roles where rolname='stylingu_rotation') then create role stylingu_rotation nologin nosuperuser nobypassrls; end if;
end $$;
grant usage on schema private, public to stylingu_rotation;
grant select,insert,update on private.credential_rotations to stylingu_rotation;
grant select(state) on public.analysis_jobs to stylingu_rotation;
create policy rotation_drain_check on public.analysis_jobs for select to stylingu_rotation using(true);
create function private.rotate_runtime_password(login_name text, password_value text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if login_name not in ('stylingu_api_blue','stylingu_api_green','stylingu_jobs_blue','stylingu_jobs_green')
   or password_value !~ '^[A-Za-z0-9_-]{48,100}$' then raise exception 'Runtime credential rotation rejected'; end if;
 execute format('alter role %I password %L',login_name,password_value);
end $$;
revoke all on function private.rotate_runtime_password(text,text) from public,anon,authenticated,stylingu_api,stylingu_jobs;
grant execute on function private.rotate_runtime_password(text,text) to stylingu_rotation;

-- A background identity is useful only while its specifically claimed job is active.
create function private.active_analysis_job() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.analysis_jobs j
   where j.id::text=auth.jwt()->>'job_id' and j.user_id=auth.uid() and j.state='processing');
$$;
revoke all on function private.active_analysis_job() from public,anon,authenticated,stylingu_api;
grant execute on function private.active_analysis_job() to stylingu_jobs;
drop policy jobs_users on public.users;
drop policy jobs_analysis on public.users;
drop policy jobs_photos on public.photos;
drop policy jobs_results on public.analysis_jobs;
create policy jobs_users on public.users for select to stylingu_jobs
 using(id=(select auth.uid()) and (select private.active_analysis_job()));
create policy jobs_analysis on public.users for update to stylingu_jobs
 using(id=(select auth.uid()) and (select private.active_analysis_job()))
 with check(id=(select auth.uid()) and (select private.active_analysis_job()));
create policy jobs_photos on public.photos for select to stylingu_jobs
 using(user_id=(select auth.uid()) and (select private.active_analysis_job()));
create policy jobs_result_read on public.analysis_jobs for select to stylingu_jobs
 using(user_id=(select auth.uid()) and id::text=(select auth.jwt()->>'job_id'));
create policy jobs_result_write on public.analysis_jobs for update to stylingu_jobs
 using(user_id=(select auth.uid()) and id::text=(select auth.jwt()->>'job_id') and state='processing')
 with check(user_id=(select auth.uid()) and id::text=(select auth.jwt()->>'job_id') and state in ('processing','completed','failed'));
