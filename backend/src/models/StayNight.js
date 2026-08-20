import mongoose from "mongoose";

/** One document per occupied night — unique index prevents double-booking stays. */
const stayNightSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true }, // YYYY-MM-DD (check-in night … night before check-out)
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", required: true }
  },
  { timestamps: true }
);

stayNightSchema.index({ dateKey: 1 }, { unique: true });

export const StayNight = mongoose.model("StayNight", stayNightSchema);
