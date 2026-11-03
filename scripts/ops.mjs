import {operation} from './security/platform-api.mjs';
const command=process.argv[2],env=process.env;
if(!env.PUBLIC_ORIGIN||!env.OPS_TOKEN)throw new Error('PUBLIC_ORIGIN and OPS_TOKEN required');
let result;
if(command==='status')result=await operation(env,'status');
else if(['check','restart'].includes(command))result=await operation(env,command,{slot:env.DEPLOY_SLOT});
else if(command==='promote')result=await operation(env,'promote',{slot:env.DEPLOY_SLOT,revision:Number(env.EXPECTED_REVISION),release:env.RELEASE_VERSION,image:env.CONTAINER_IMAGE});
else throw new Error('Usage: ops.mjs status|check|restart|promote');
console.log(JSON.stringify(result));
