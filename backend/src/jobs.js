import {writeFileSync} from 'node:fs';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const envFile=fileURLToPath(new URL('../.env',import.meta.url));if(existsSync(envFile))process.loadEnvFile(envFile);
const {connectDB,closeDB}=await import('./config/db.js');
const {products}=await import('./product.js');
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
await connectDB();
console.log('Ejecutor de análisis listo.');
const heartbeat = () => writeFileSync('/tmp/stylingu-jobs.heartbeat', String(Date.now()));
heartbeat(); const heartbeatTimer = setInterval(heartbeat, 5000);heartbeatTimer.unref();
try {while(!stopping){try{if(await products.runOne())continue;}catch{console.error('No se pudo ejecutar el trabajo; se reintentará la consulta de cola.');}await new Promise(r=>setTimeout(r,1500));}}finally{clearInterval(heartbeatTimer);await closeDB();}
