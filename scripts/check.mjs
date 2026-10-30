import {readdirSync} from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
const dirs=['shared','backend/src','frontend/public/js','scripts'];let count=0;
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(js|mjs)$/.test(p)){const result=spawnSync(process.execPath,['--check',p],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);count++;}}}dirs.forEach(walk);console.log('Sintaxis verificada: '+count+' archivos.');
