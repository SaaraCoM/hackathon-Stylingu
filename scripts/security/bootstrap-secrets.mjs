import {putStoreSecret} from './platform-api.mjs';
import {environmentTarget} from '../environment.mjs';
const env=process.env;
environmentTarget(env);
for(const key of ['SUPABASE_SECRET_KEY','MODEL_API_KEY','OPS_TOKEN'])if(!env[key])throw new Error('Missing '+key);
for(const [key,suffix]of [['SUPABASE_SECRET_KEY','supabase-secret'],['MODEL_API_KEY','model-key']]){
 if(!env[key])throw new Error('Missing '+key);
 for(const slot of ['blue','green'])await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-'+slot+'-'+suffix,env[key]);
}
await putStoreSecret(env,'stylingu-'+env.DEPLOY_ENV+'-ops-token',env.OPS_TOKEN);
console.log('Runtime application secrets stored remotely; no values logged.');
