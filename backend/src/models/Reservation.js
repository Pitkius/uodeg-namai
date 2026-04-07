import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AvailabilitySlot",
      required: false,
      default: null
    },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    notes: { type: String, maxlength: 1000, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

reservationSchema.index({ userId: 1, start: 1 });
reservationSchema.index({ start: 1 });

// Vienas aktyvus įrašas vienam slotId (tik kai slotId yra ObjectId). Kelios nakvynės be sloto (slotId: null) — leidžiama.
// Atlas neleidžia partial index su $ne: null — naudojame tik $type: objectId.
reservationSchema.index(
  { slotId: 1 },
  {
    name: "uniq_slotId_when_active",
    unique: true,
    partialFilterExpression: {
      slotId: { $type: "objectId" },
      status: { $in: ["pending", "confirmed"] }
    }
  }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);

