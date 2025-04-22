import mongoose from "mongoose";

const ScaleSchema = new mongoose.Schema(
  {
    scale_id: { type: String, required: true, unique: true },
    serial_number: { type: String, required: true },
    hardware_key: { type: String, required: true },
    name: { type: String, required: true },
    latest_transmission_timestamp: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.Scale || mongoose.model("Scale", ScaleSchema);
