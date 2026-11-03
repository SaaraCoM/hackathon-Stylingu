import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const envFile=fileURLToPath(new URL('../.env',import.meta.url));if(existsSync(envFile))process.loadEnvFile(envFile);
const {storageMode}=await import('../../shared/storage.js');
if(process.env.NODE_ENV==='production'){
 const problems=[];
 if(!process.env.SUPABASE_SECRET_KEY?.startsWith('sb_secret_'))problems.push('SUPABASE_SECRET_KEY moderna');
 if(!process.env.SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))problems.push('SUPABASE_PUBLISHABLE_KEY');
 if(!process.env.DATABASE_URL)problems.push('DATABASE_URL');
 if(!process.env.PUBLIC_ORIGIN?.startsWith('https://'))problems.push('PUBLIC_ORIGIN HTTPS');
 if(process.env.AI_PROVIDER==='mock')problems.push('proveedor de IA real');
 if(storageMode()!=='supabase')problems.push('SUPABASE_URL/SUPABASE_SECRET_KEY');
 if(problems.length)throw new Error('Producción requiere: '+problems.join(', ')+'.');
}
const {default:app}=await import('./index.js');
const {closeDB}=await import('./config/db.js');
const port=Number(process.env.PORT)||3000;
const server=app.listen(port,'0.0.0.0',()=>console.log('StylingU listo. Puerto '+port));
server.on('error',error=>{
 if(error.code==='EADDRINUSE'){
  console.error('El puerto '+port+' ya está ocupado. StylingU probablemente ya está arrancado: abre http://127.0.0.1:'+port+' o detén el proceso anterior.');
  process.exit(1);
 }
 console.error(error);
 process.exit(1);
});
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await closeDB();process.exit(0);}));
