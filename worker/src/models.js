import mongoose from "mongoose";

/* Espejo de backend/src/models (User/Session/Outfit) para el runtime
 * Workers: cada empaqueta su propio mongoose (backend Node, aquí ≥9 que
 * es el que soporta Workers), así que los esquemas viven en ambos. */

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

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const outfitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    top: { type: String, required: true, maxlength: 120 },
    topDesc: { type: String, default: "", maxlength: 300 },
    bottom: { type: String, required: true, maxlength: 120 },
    bottomDesc: { type: String, default: "", maxlength: 300 },
    jacket: { type: String, required: true, maxlength: 120 },
    jacketDesc: { type: String, default: "", maxlength: 300 },
    acc: { type: String, default: "", maxlength: 120 },
    accDesc: { type: String, default: "", maxlength: 300 },
    note: { type: String, default: "", maxlength: 500 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
export const Session = mongoose.models.Session ?? mongoose.model("Session", sessionSchema);
export const Outfit = mongoose.models.Outfit ?? mongoose.model("Outfit", outfitSchema);
