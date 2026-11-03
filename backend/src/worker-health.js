import { statSync } from 'node:fs';
export function workerHealthy() {
  if (process.env.NODE_ENV === 'test') return true;
  try { return Date.now() - statSync('/tmp/stylingu-jobs.heartbeat').mtimeMs < 30000; } catch { return false; }
}
