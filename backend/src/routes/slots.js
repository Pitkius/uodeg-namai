import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Reservation } from "../models/Reservation.js";
import { badRequest } from "../utils/httpError.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

export const slotsRouter = express.Router();

// Public: list active slots in date range
slotsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw badRequest("Invalid date range");
    }

    const q = { isActive: true };
    if (from || to) q.start = {};
    if (from) q.start.$gte = from;
    if (to) q.start.$lte = to;

    const slots = await AvailabilitySlot.find(q).sort({ start: 1 }).lean();
    res.json({ slots });
  })
);

// Admin: create slot
const createSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

slotsRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid slot data");
    const start = new Date(parsed.data.start);
    const end = new Date(parsed.data.end);
    if (!(end > start)) throw badRequest("End must be after start");

    const slot = await AvailabilitySlot.create({ start, end, isActive: true });
    res.status(201).json({ slot });
  })
);

// Admin: deactivate (remove) slot (soft delete)
slotsRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const slot = await AvailabilitySlot.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!slot) return res.status(404).json({ message: "Slot not found" });

    // Cancel any pending reservations for this slot
    await Reservation.updateMany(
      { slotId: slot._id, status: { $in: ["pending", "confirmed"] } },
      { $set: { status: "cancelled" } }
    );

    res.json({ slot });
  })
);

