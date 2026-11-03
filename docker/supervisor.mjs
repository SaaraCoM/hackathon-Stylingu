import { spawn } from 'node:child_process';
const children = new Set();
let stopping = false, failed = false;
function stop(code) {
  if (stopping) return;
  stopping = true; process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
  const timeout = setTimeout(() => { for (const child of children) child.kill('SIGKILL'); }, 600000);
  timeout.unref();
}
function launch(file, env) {
  const child = spawn(process.execPath, [file], { stdio: 'inherit', env });
  children.add(child);
  child.on('error', () => { failed = true; stop(1); });
  child.on('exit', code => {
    children.delete(child);
    if (!stopping) { failed = true; stop(code || 1); }
    if (!children.size) process.exit(failed ? 1 : process.exitCode || 0);
  });
}
launch('backend/src/jobs.js', { ...process.env, DATABASE_URL: process.env.JOBS_DATABASE_URL || process.env.DATABASE_URL, DB_ROLE: 'stylingu_jobs' });
launch('backend/src/server.js', { ...process.env, DB_ROLE: 'stylingu_api' });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stop(0));
