import mongoose from "mongoose";

const colorimetrySchema = new mongoose.Schema(
  {
    season: String,
    undertone: String,
    contrast: String,
    paletteHex: [String],
    analyzedAt: Date
  },
  { _id: false }
);

export const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: String,
  colorimetry: colorimetrySchema,
  preferences: {
    goals: [String],
    jewelry: String,
    styles: [String]
  }
});

export const wardrobeItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  category: String,
  imageUrl: String,
  dominantColors: [String],
  aiAnalysis: {
    matchScore: Number,
    verdict: String,
    reason: String
  }
});

export const evaluationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  type: String,
  productName: String,
  aiVerdict: {
    recommendation: String,
    matchScore: Number,
    details: String
  }
});
