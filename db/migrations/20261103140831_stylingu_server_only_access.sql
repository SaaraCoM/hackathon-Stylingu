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
