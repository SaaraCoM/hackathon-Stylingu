// Fetches a pull-only registry credential and sends it to Docker stdin, without logging it.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {jsonRequest} from './security/platform-api.mjs';
try {
 if(!process.env.DOCKER_CONFIG?.startsWith('/dev/shm/'))throw new Error();
 await mkdir(process.env.DOCKER_CONFIG,{recursive:true,mode:0o700});
 const response=await jsonRequest('https://api.cloudflare.com/client/v4/accounts/'+process.env.CLOUDFLARE_ACCOUNT_ID+'/containers/registries/registry.cloudflare.com/credentials',process.env.CLOUDFLARE_API_TOKEN,{method:'POST',body:{expiration_minutes:15,permissions:['pull']}});
 const credentials=response.result || response;
 if(typeof credentials.username!=='string'||typeof credentials.password!=='string')throw new Error();
 const child=spawn('docker',['login','--password-stdin','--username',credentials.username,'registry.cloudflare.com'],{stdio:['pipe','inherit','inherit']});
 child.stdin.end(credentials.password);
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 if(code!==0)throw new Error();
}catch{console.error('Temporary registry authentication failed.');process.exitCode=1;}
