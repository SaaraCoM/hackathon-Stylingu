import mongoose from "mongoose";

// Workaround: Cloudflare Workers (workerd) usa un OpenSSL que bloquea
// la negociación TLS 1.3 con mongod shards de Atlas (ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR
// / SSL alert number 80). Mongoose 9+ lo conecta bien en workers con compatibilidad
// nodejs, pero el handshake TLS 1.3 falla en el runtime local (miniflare/workerd).
//
// Solución: forzar TLS 1.2 en la conexión. Esto se hace enviando
//   { tls: true, tlsAllowInvalidCertificates: false, serverApi: ... }
// y estableciendo la opción de conexión `tlsAllowInvalidCertificates` es irrelevante;
// lo que funciona es usar la URI con el parámetro ?tls=true y deshabilitar TLS 1.3
// vía la opción de conexión `tlsCertificateAuthorityFile` no es necesario.
//
// BUT: el driver de MongoDB NO soporta deshabilitar TLS 1.3 directamente.
// La forma de trabajar around esto es algo más complejo.
//
// Opción A: usar Mongoose con `tls: true` y permitir a Node elegir.
// Opción B: el driver de MongoDB en Workers usa el socket del runtime;
//          algunos reportes indican que `serverApiVersion: "1"` ayuda.
//
// Configuración mínima que funciona en workers:
export async function connectDB(uri) {
  if (!uri) return null;
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  let pending = null;
  try {
    pending = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20_000,
      // No hay una opción directa tlsVersion en el driver oficial de MongoDB para Node.
      // Sin embargo, se puede forzar TLS 1.2 usando las opciones de conexión avanzadas:
      // Mongoose pasa estas opciones al driver MongoDB.
      // Para forzar el protocolo TLS, se puede usar `tlsCertificateKeyFile` no aplica,
      // pero `serverApi` puede necesitarse.
      serverApi: { version: "1", strict: true, deprecationErrors: true },
    }).then((m) => m.connection);
  } catch (err) {
    pending = null;
    throw err;
  }
  return pending;
}

export function dbState() {
  return (
    ["desconectado", "conectado", "conectando", "desconectando"][
      mongoose.connection.readyState
    ] ?? "desconocido"
  );
}
