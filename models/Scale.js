// models/Scale.js
import mongoose from "mongoose";

const ScaleSchema = new mongoose.Schema(
  {
    scale_id: String,
    serial_number: String,
    hardware_key: String,
    latest_transmission_timestamp: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Scale || mongoose.model("Scale", ScaleSchema);
