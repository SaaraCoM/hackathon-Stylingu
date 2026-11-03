// Render public binding identifiers from the sole router configuration; never write secret values.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {environmentTarget} from './environment.mjs';
environmentTarget();
const id=process.env.CF_SECRET_STORE_ID;
if(!/^[a-f0-9]{32}$/.test(id||'')||/^0+$/.test(id))throw new Error('A real Secrets Store id is required');
const source=await readFile(new URL('../wrangler.toml',import.meta.url),'utf8');
const config=source.replaceAll('00000000000000000000000000000000',id).replace('main = "worker/router.js"','main = "../../worker/router.js"');
await mkdir('.wrangler/deploy',{recursive:true});
await writeFile('.wrangler/deploy/router.toml',config);
