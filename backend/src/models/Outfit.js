import mongoose from "mongoose";

// Conjuntos del armario. Sin auth todavía: cada documento guarda sus piezas
// como texto plano + fecha de guardado. Campo abierto a futuras claves (ia,
// temporada) con strict:false en el subdocumento no, solo raíz conocida.
const outfitSchema = new mongoose.Schema(
  {
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

export const Outfit = mongoose.models.Outfit ?? mongoose.model("Outfit", outfitSchema);
