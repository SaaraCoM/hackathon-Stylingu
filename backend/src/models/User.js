import mongoose from "mongoose";

// Cuenta local mínima: email único + hash bcrypt. Nombre y preferencias
// del dossier (goals/joyas/estilos) viven aquí cuando haya login real;
// mientras tanto el onboarding sigue en localStorage del frontend.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160
    },
    passwordHash: { type: String, required: true },
    preferences: {
      goals: { type: [String], default: [] },
      jewelry: { type: String, default: "" },
      styles: { type: [String], default: [] }
    }
  },
  { timestamps: true }
);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
