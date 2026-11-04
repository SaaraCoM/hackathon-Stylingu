import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const envFile=fileURLToPath(new URL('../.env',import.meta.url));if(existsSync(envFile))process.loadEnvFile(envFile);
const {storageMode}=await import('../../shared/storage.js');
if(process.env.NODE_ENV==='production'){
 const problems=[];
 if(!process.env.DATABASE_URL)problems.push('DATABASE_URL');
 if(!process.env.PUBLIC_ORIGIN?.startsWith('https://'))problems.push('PUBLIC_ORIGIN HTTPS');
 if(process.env.AI_PROVIDER==='mock')problems.push('proveedor de IA real');
 if(storageMode()!=='supabase')problems.push('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
 if(!process.env.TURNSTILE_SITE_KEY||!process.env.TURNSTILE_SECRET)problems.push('TURNSTILE_SITE_KEY/TURNSTILE_SECRET');
 if(problems.length)throw new Error('Producción requiere: '+problems.join(', ')+'.');
}
const {default:app}=await import('./index.js');
app.locals.standaloneProduction=process.env.NODE_ENV==='production';
const {closeDB}=await import('./config/db.js');
const port=Number(process.env.PORT)||3000;
const server=app.listen(port,()=>console.log('StylingU listo. Puerto '+port));
server.on('error',error=>{
 if(error.code==='EADDRINUSE'){
  console.error('El puerto '+port+' ya está ocupado. StylingU probablemente ya está arrancado: abre http://127.0.0.1:'+port+' o detén el proceso anterior.');
  process.exit(1);
 }
 console.error(error);
 process.exit(1);
});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await closeDB();process.exit(0);}));
