// Limpia sesiones y tokens de recuperación caducados.
// Uso: node scripts/prune.mjs   (pensado para cron diario)
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../backend/.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const { connectDB, closeDB } = await import('../backend/src/config/db.js');
const { pruneExpired } = await import('../backend/src/db/repo.js');
await connectDB();
try {
  const removed = await pruneExpired();
  console.log('Sesiones caducadas: ' + removed.sessions + '. Tokens caducados: ' + removed.tokens + '.');
} finally {
  await closeDB();
}
