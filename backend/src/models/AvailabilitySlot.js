import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

availabilitySlotSchema.index({ start: 1, end: 1 }, { unique: true });
availabilitySlotSchema.index({ start: 1 });

export const AvailabilitySlot = mongoose.model(
  "AvailabilitySlot",
  availabilitySlotSchema
);

