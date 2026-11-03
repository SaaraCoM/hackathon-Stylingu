import { Container, getContainer } from '@cloudflare/containers';
const SECRET_FIELDS=['DATABASE_URL','JOBS_DATABASE_URL','SUPABASE_SECRET_KEY','MODEL_API_KEY'];
export class StylinguContainer extends Container {
  defaultPort=8080;
  sleepAfter='15m';
  pingEndpoint='localhost/api/ready';
  enableInternet=true;
  async fetch(request) {
    const values=Object.fromEntries(await Promise.all(SECRET_FIELDS.map(async k=>[k,await this.env[k].get()])));
    if(this.env.PG_SSL_CA)values.PG_SSL_CA=this.env.PG_SSL_CA;
    if(SECRET_FIELDS.some(k=>!values[k]) || !this.env.PUBLIC_ORIGIN?.startsWith('https://')) return Response.json({code:'DEPLOY_CONFIG'},{status:503});
    const envVars={};
    for(const k of [...SECRET_FIELDS,'PG_SSL_CA']) if(values[k])envVars[k]=values[k];
    Object.assign(envVars,{NODE_ENV:'production',PORT:'8080',TRUST_PROXY:'1',PG_POOL_MAX:'3',SUPABASE_URL:this.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:this.env.SUPABASE_PUBLISHABLE_KEY,PUBLIC_ORIGIN:this.env.PUBLIC_ORIGIN,RELEASE_VERSION:this.env.RELEASE_VERSION,AI_PROVIDER:'meta'});
    await this.startAndWaitForPorts({startOptions:{envVars}});
    return this.containerFetch(request);
  }
  onError(){console.error(JSON.stringify({event:'container_start_failed'}));throw new Error('Container unavailable');}
}
export default {async fetch(request,env){
 const container=getContainer(env.STYLINGU_CONTAINER,'app');
 if(new URL(request.url).pathname==='/internal/restart'&&request.method==='POST'){
  await container.stop();
  return container.fetch(new Request('https://internal/api/ready'));
 }
 return container.fetch(request);
}};
