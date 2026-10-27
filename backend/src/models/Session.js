import mongoose from "mongoose";

// Sesiones opacas: el servidor guarda el token con hash, la cookie solo
// lleva el secreto aleatorio. Sin JWT: revocación = borrar el documento.
const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Session = mongoose.models.Session ?? mongoose.model("Session", sessionSchema);
