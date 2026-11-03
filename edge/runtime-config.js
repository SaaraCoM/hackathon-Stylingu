// Supabase permite leer secretos, pero no modificar Deno.env.
// Se configura solo la vista Node consumida por los módulos existentes.
export function configureNodeRuntime(nodeProcess,getEnv,{publicOrigin,release}){
  const meta=getEnv('META_AI_API_KEY')||getEnv('MODEL_API_KEY')||'';
  nodeProcess.env={
    NODE_ENV:'production',DATABASE_URL:getEnv('SUPABASE_DB_URL')||'',
    SUPABASE_URL:getEnv('SUPABASE_URL')||'',
    SUPABASE_SERVICE_ROLE_KEY:getEnv('SUPABASE_SERVICE_ROLE_KEY')||'',
    META_AI_API_KEY:meta,MODEL_API_KEY:meta,
    SMTP_URL:getEnv('SMTP_URL')||'',MAIL_FROM:getEnv('MAIL_FROM')||'',
    PUBLIC_ORIGIN:publicOrigin,TRUST_PROXY:'0',PG_POOL_MAX:'2',
    AI_PROVIDER:'meta',RELEASE_VERSION:release
  };
}
