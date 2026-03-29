import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  name: String,
  cost_index: Number,
  strength_index: Number,
  durability_index: Number,
  best_use: [String]
});

export const Material = mongoose.model("Material", materialSchema);