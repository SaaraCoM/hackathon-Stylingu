import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.error||r.status!==0)throw new Error('Required audit check failed or unavailable: '+cmd);}
run(process.execPath,['scripts/check.mjs']);
for(const path of ['.','backend','frontend'])run('npm',['audit','--prefix',path,'--audit-level=high']);
// The skill's scanner must not silently skip npm/CVE checks because npm is absent.
run('python3',['security/vendor/all-deploy/audit.py','.','--profile','app']);
for(const file of ['backend/package-lock.json','frontend/package-lock.json','package-lock.json'])if(!existsSync(file))throw new Error('Missing lockfile');
const config=JSON.parse(readFileSync('backend/package.json'));
if(config.dependencies.bcryptjs||config.dependencies.nodemailer)throw new Error('Legacy auth dependencies remain');
