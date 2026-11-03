-- Rate limits Edge: solo el propietario accede al esquema privado.
create schema if not exists private_runtime;
revoke all on schema private_runtime from public;
create table if not exists private_runtime.request_limits (
  key text primary key,
  hits integer not null check (hits > 0),
  expires_at timestamptz not null
);
create index if not exists request_limits_expiry on private_runtime.request_limits(expires_at);
alter table private_runtime.request_limits enable row level security;
revoke all on private_runtime.request_limits from public;
do $limits$
declare role_name text;
begin
  foreach role_name in array array['anon','authenticated','service_role'] loop
    if exists(select 1 from pg_roles where rolname=role_name) then
      execute format('revoke all on schema private_runtime from %I',role_name);
      execute format('revoke all on private_runtime.request_limits from %I',role_name);
    end if;
  end loop;
end
$limits$;
