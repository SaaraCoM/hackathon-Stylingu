import {appendFile} from 'node:fs/promises';
import {operation} from './security/platform-api.mjs';
let state;
if(process.env.BOOTSTRAP==='true')state={active:'green',revision:0};
else state=await operation(process.env,'status');
const slot=state.active==='blue'?'green':'blue';
const output=`slot=${slot}\nrevision=${state.revision}\n`;
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,output);else process.stdout.write(output);
