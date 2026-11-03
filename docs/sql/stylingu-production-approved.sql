-- StylingU · esquema inicial (Postgres / Supabase)
-- Base limpia: no hay migración de datos desde MongoDB.
-- Convención: snake_case en SQL, alias camelCase en las consultas para no
-- cambiar el contrato JSON que ya consume el frontend.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- identidad
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 60),
  email         text not null check (char_length(email) between 3 and 160),
  password_hash text not null,
  preferences   jsonb not null default '{"goals":[],"jewelry":"","styles":[]}'::jsonb,
  analysis      jsonb,
  photo_input   jsonb,
  profile       jsonb not null default '{"version":0,"visualVersion":0,"declared":{},"corrections":[]}'::jsonb,
  deleting      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists users_email_unique on users (lower(email));

-- Fotos: los bytes viven en Supabase Storage; aquí solo metadatos.
create table if not exists photos (
  id          text primary key,
  user_id     uuid not null references users(id) on delete cascade,
  mime        text not null,
  storage_key text not null,
  bytes       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists photos_user on photos (user_id);

-- Sesiones opacas: se guarda el hash, nunca el token.
create table if not exists sessions (
  token_hash text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user on sessions (user_id);
create index if not exists sessions_expires on sessions (expires_at);

create table if not exists reset_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  hash       text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists reset_tokens_expires on reset_tokens (expires_at);

-- ---------------------------------------------------------------- armario
create table if not exists outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  top         text not null check (char_length(top) <= 120),
  top_desc    text not null default '' check (char_length(top_desc) <= 300),
  bottom      text not null check (char_length(bottom) <= 120),
  bottom_desc text not null default '' check (char_length(bottom_desc) <= 300),
  jacket      text not null check (char_length(jacket) <= 120),
  jacket_desc text not null default '' check (char_length(jacket_desc) <= 300),
  acc         text not null default '' check (char_length(acc) <= 120),
  acc_desc    text not null default '' check (char_length(acc_desc) <= 300),
  note        text not null default '' check (char_length(note) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists outfits_user on outfits (user_id, created_at desc);

create table if not exists garments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null,
  category   text not null,
  colors     text[] not null default '{}',
  season     text[] not null default '{}',
  occasions  text[] not null default '{}',
  excludes   text[] not null default '{}',
  available  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists garments_user on garments (user_id, created_at);

create table if not exists outfit_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  plan_date       date not null,
  time_zone       text not null default '',
  garment_ids     text[] not null default '{}',
  signature       text not null,
  labels          text[] not null default '{}',
  colors          text[] not null default '{}',
  origin          text not null default '',
  explanation     text not null default '',
  profile_version integer not null default 0,
  status          text not null default 'proposed',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, plan_date)
);

-- ---------------------------------------------------------------- catálogo
create table if not exists products (
  id          text primary key,
  brand       text not null default '',
  name        text not null default '',
  category    text not null default '',
  description text not null default '',
  source      text not null default '',
  checked_at  timestamptz
);

create table if not exists product_variants (
  id                   text primary key,
  product_id           text not null references products(id) on delete cascade,
  shade                text not null default '',
  market               text not null default '',
  finish               text not null default '',
  hex                  text not null default '',
  color_verified       boolean not null default false,
  barcodes             text[] not null default '{}',
  ingredients          text[] not null default '{}',
  ingredients_complete boolean not null default false,
  source               text not null default '',
  checked_at           timestamptz
);
create index if not exists variants_product on product_variants (product_id);
create index if not exists variants_barcodes on product_variants using gin (barcodes);

create table if not exists product_offers (
  id         text primary key,
  variant_id text not null references product_variants(id) on delete cascade,
  merchant   text not null default '',
  price      numeric(12,2),
  currency   text not null default '',
  url        text not null default '',
  checked_at timestamptz
);
create index if not exists offers_variant on product_offers (variant_id, checked_at desc);

create table if not exists owned_cosmetics (
  user_id    uuid not null references users(id) on delete cascade,
  variant_id text not null references product_variants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create table if not exists recommendation_feedback (
  user_id    uuid not null references users(id) on delete cascade,
  variant_id text not null references product_variants(id) on delete cascade,
  action     text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create table if not exists tutorial_progress (
  user_id    uuid not null references users(id) on delete cascade,
  key        text not null,
  completed  integer[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- ---------------------------------------------------------------- trabajos
create table if not exists analysis_jobs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  key             text not null,
  hash            text not null,
  state           text not null check (state in ('queued','processing','completed','failed','uncertain')),
  input_version   text not null default '',
  profile_version integer not null default 0,
  payload         jsonb,
  result          jsonb,
  error           jsonb,
  started_at      timestamptz,
  finished_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, key)
);
-- Un solo trabajo activo por huella de entrada; sustituye al índice parcial de Mongo.
create unique index if not exists analysis_jobs_active_hash
  on analysis_jobs (user_id, hash) where state in ('queued','processing');
create index if not exists analysis_jobs_state on analysis_jobs (state, created_at);

create table if not exists quotas (
  user_id uuid not null references users(id) on delete cascade,
  day     date not null,
  count   integer not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------- migraciones
create table if not exists schema_migrations (
  name       text primary key,
  applied_at timestamptz not null default now()
);


-- Fecha de nacimiento para aplicar la edad mínima de registro.
-- Las cuentas anteriores pueden conservarla vacía; las nuevas la exigen en la API.
alter table users add column if not exists birth_date date;

-- StylingU: acceso a tablas exclusivamente desde el backend Express.
-- La identidad continúa en users/sessions; no se usa Supabase Auth.
-- El propietario que ejecuta las migraciones conserva su acceso interno.
-- No aplicar sobre un esquema de Supabase Auth: requiere su propio adaptador.
do $migration$
declare
  table_name text;
  role_name text;
  app_tables constant text[] := array[
    'users','photos','sessions','reset_tokens','outfits','garments',
    'outfit_plans','products','product_variants','product_offers',
    'owned_cosmetics','recommendation_feedback','tutorial_progress',
    'analysis_jobs','quotas','schema_migrations'
  ];
begin
  foreach table_name in array app_tables loop
    if to_regclass(format('public.%I',table_name)) is null then
      raise exception 'Falta tabla requerida: %', table_name;
    end if;
    if exists(select 1 from pg_policies p
              where p.schemaname='public' and p.tablename=table_name) then
      raise exception 'Revisar políticas existentes antes de migrar: %', table_name;
    end if;
  end loop;
  foreach table_name in array app_tables loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all privileges on table public.%I from public',table_name);
    foreach role_name in array array['anon','authenticated','service_role'] loop
      if exists(select 1 from pg_roles where rolname=role_name) then
        execute format('revoke all privileges on table public.%I from %I',table_name,role_name);
      end if;
    end loop;
  end loop;
end
$migration$;


insert into public.schema_migrations(name) values ('001_init.sql'),('002_birth_date.sql'),('20261103140831_stylingu_server_only_access.sql') on conflict(name) do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('stylingu-photos','stylingu-photos',false,10485760,array['image/jpeg']) on conflict(id) do nothing;