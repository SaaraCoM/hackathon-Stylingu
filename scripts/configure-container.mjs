import {environmentTarget} from './environment.mjs';
// Produces a non-secret config only. Real wrangler commands remain visible in the workflows/runbook.
import {mkdir,writeFile} from 'node:fs/promises';
const env=process.env;environmentTarget(env);
for(const k of ['DEPLOY_ENV','DEPLOY_SLOT','CONTAINER_IMAGE','CF_SECRET_STORE_ID','PUBLIC_ORIGIN','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','RELEASE_VERSION'])if(!env[k])throw new Error('Missing '+k);
if(!['staging','production'].includes(env.DEPLOY_ENV)||!['blue','green'].includes(env.DEPLOY_SLOT))throw new Error('Invalid deployment target');
if(!/^registry\.cloudflare\.com\/[a-f0-9]{32}\/[a-z0-9/_-]+@sha256:[a-f0-9]{64}$/.test(env.CONTAINER_IMAGE))throw new Error('A pinned Cloudflare Registry image digest is required');
if(!/^[a-f0-9]{32}$/.test(env.CF_SECRET_STORE_ID))throw new Error('Invalid Secret Store id');
const q=JSON.stringify;
const text=`name = ${q('stylingu-'+env.DEPLOY_ENV+'-'+env.DEPLOY_SLOT)}
main = "../../worker/container.js"
compatibility_date = "2026-10-30"
compatibility_flags = ["nodejs_compat"]
workers_dev = false
[observability]
enabled = true
head_sampling_rate = 0.1
[observability.logs]
enabled = true
invocation_logs = false
[vars]
PUBLIC_ORIGIN = ${q(env.PUBLIC_ORIGIN)}
SUPABASE_URL = ${q(env.SUPABASE_URL)}
SUPABASE_PUBLISHABLE_KEY = ${q(env.SUPABASE_PUBLISHABLE_KEY)}
RELEASE_VERSION = ${q(env.RELEASE_VERSION)}
PG_SSL_CA = ${q(env.PG_SSL_CA || '')}
[[containers]]
class_name = "StylinguContainer"
image = ${q(env.CONTAINER_IMAGE)}
instance_type = "basic"
max_instances = 1
rollout_active_grace_period = 600
[[durable_objects.bindings]]
name = "STYLINGU_CONTAINER"
class_name = "StylinguContainer"
[exports.StylinguContainer]
type = "durable-object"
storage = "sqlite"
`;
const secretNames={DATABASE_URL:'database-url',JOBS_DATABASE_URL:'jobs-database-url',SUPABASE_SECRET_KEY:'supabase-secret',MODEL_API_KEY:'model-key'};
const bindings=Object.entries(secretNames).map(([binding,suffix])=>`[[secrets_store_secrets]]
binding = ${q(binding)}
store_id = ${q(env.CF_SECRET_STORE_ID)}
secret_name = ${q('stylingu-'+env.DEPLOY_ENV+'-'+env.DEPLOY_SLOT+'-'+suffix)}
`).join('');
await mkdir('.wrangler/deploy',{recursive:true});await writeFile('.wrangler/deploy/container.toml',text+bindings);
