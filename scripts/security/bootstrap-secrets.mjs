import {putStoreSecret} from './platform-api.mjs';
const env=process.env;
if(!['staging','production'].includes(env.DEPLOY_ENV))throw new Error('DEPLOY_ENV required');
for(const [key,suffix]of [['SUPABASE_SECRET_KEY','supabase-secret'],['MODEL_API_KEY','model-key']]){
 if(!env[key])throw new Error('Missing '+key);
 for(const slot of ['blue','green'])await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+slot+'-'+suffix,env[key]);
}
console.log('Runtime application secrets stored remotely; no values logged.');
