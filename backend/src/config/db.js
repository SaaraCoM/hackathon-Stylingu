import mongoose from "mongoose";

// Conexión única a Mongo. Sin MONGODB_URI arranca igual pero sin base
// de datos (el frontend sigue en localStorage); /api/health lo refleja.
export async function connectDB(uri) {
  if (!uri) {
    console.warn("[db] MONGODB_URI sin definir: sirvo sin base de datos.");
    return null;
  }
  mongoose.connection.on("error", (err) => console.error("[db] error:", err.message));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  console.log("[db] MongoDB conectado");
  return mongoose.connection;
}

export function dbState() {
  return (
    ["desconectado", "conectado", "conectando", "desconectando"][
      mongoose.connection.readyState
    ] ?? "desconocido"
  );
}
