// backend/src/config/db.js
// Punto de entrada histórico: ahora delega en el pool de Postgres.
export { connectDB, closeDB, dbState, query, withTransaction, isUniqueViolation, databaseUrl } from '../db/pool.js';
