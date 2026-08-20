import mongoose from "mongoose";

const dailyTrafficSchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true, unique: true }, // YYYY-MM-DD (Europe/Vilnius-ish local server day)
    pageViews: { type: Number, default: 0 }
  },
  { timestamps: true }
);

const visitorDaySchema = new mongoose.Schema(
  {
    dateKey: { type: String, required: true },
    visitorId: { type: String, required: true, maxlength: 64 }
  },
  { timestamps: true }
);

visitorDaySchema.index({ dateKey: 1, visitorId: 1 }, { unique: true });
visitorDaySchema.index({ dateKey: 1 });

export const DailyTraffic = mongoose.model("DailyTraffic", dailyTrafficSchema);
export const VisitorDay = mongoose.model("VisitorDay", visitorDaySchema);
