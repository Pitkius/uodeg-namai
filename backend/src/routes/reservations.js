import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";
import { Reservation } from "../models/Reservation.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const reservationsRouter = express.Router();

function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

async function hasOverlap(start, end) {
  return Reservation.findOne({
    status: { $in: ["pending", "confirmed"] },
    start: { $lt: end },
    end: { $gt: start }
  })
    .select("_id")
    .lean();
}

// Public: get booked slot IDs (no PII)
reservationsRouter.get(
  "/booked",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw badRequest("Invalid date range");
    }

    const q = { status: { $in: ["pending", "confirmed"] } };
    if (from || to) q.start = {};
    if (from) q.start.$gte = from;
    if (to) q.start.$lte = to;

    const rows = await Reservation.find(q).select("slotId").lean();
    const bookedSlotIds = rows.filter((r) => r.slotId).map((r) => r.slotId.toString());
    res.json({ bookedSlotIds });
  })
);

// Public: occupied stay intervals (no PII) — for calendar overlay
reservationsRouter.get(
  "/public",
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw badRequest("Invalid date range");
    }

    const q = { status: { $in: ["pending", "confirmed"] } };
    if (from && to) {
      q.start = { $lt: to };
      q.end = { $gt: from };
    } else if (from) {
      q.end = { $gt: from };
    } else if (to) {
      q.start = { $lt: to };
    }

    const rows = await Reservation.find(q).select("start end").sort({ start: 1 }).lean();
    const intervals = rows.map((r) => ({
      start: r.start,
      end: r.end
    }));
    res.json({ intervals });
  })
);

// User: list own reservations
reservationsRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reservations = await Reservation.find({ userId: req.user._id })
      .sort({ start: -1 })
      .lean();
    res.json({ reservations });
  })
);

// Admin: list all reservations (range optional)
reservationsRouter.get(
  "/",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      throw badRequest("Invalid date range");
    }
    const q = {};
    if (from || to) q.start = {};
    if (from) q.start.$gte = from;
    if (to) q.start.$lte = to;

    const reservations = await Reservation.find(q)
      .populate({ path: "userId", select: "name email photos" })
      .sort({ start: 1 })
      .lean();

    const mapped = reservations.map((r) => ({
      ...r,
      ownerName: r.userId?.name || r.userName,
      ownerEmail: r.userId?.email || "",
      ownerPhotos: Array.isArray(r.userId?.photos) ? r.userId.photos : []
    }));

    res.json({ reservations: mapped });
  })
);

// User: book a stay range (check-in day … check-out day exclusive) — motel
const staySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional()
});

reservationsRouter.post(
  "/stay",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = staySchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid stay data");

    const start = parseYmd(parsed.data.checkIn);
    const end = parseYmd(parsed.data.checkOut);
    if (!start || !end) throw badRequest("Invalid dates");
    if (end <= start) throw badRequest("Check-out must be after check-in");

    // Viena vieta vienu metu: bet koks persidengimas su aktyvia rezervacija neleidžiamas.
    const overlap = await hasOverlap(start, end);
    if (overlap) throw badRequest("Šios dienos jau užimtos");

    const reservation = await Reservation.create({
      userId: req.user._id,
      userName: req.user.name,
      slotId: null,
      start,
      end,
      notes: parsed.data.notes || "",
      status: "pending"
    });
    res.status(201).json({ reservation });
  })
);

// User: create reservation for a slot
const createSchema = z.object({
  slotId: z.string().min(1),
  notes: z.string().max(1000).optional()
});

reservationsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid reservation data");

    const slot = await AvailabilitySlot.findOne({
      _id: parsed.data.slotId,
      isActive: true
    }).lean();
    if (!slot) throw notFound("Slot not found");

    const overlap = await hasOverlap(slot.start, slot.end);
    if (overlap) throw badRequest("This time overlaps an existing booking");

    try {
      const reservation = await Reservation.create({
        userId: req.user._id,
        userName: req.user.name,
        slotId: slot._id,
        start: slot.start,
        end: slot.end,
        notes: parsed.data.notes || "",
        status: "pending"
      });
      res.status(201).json({ reservation });
    } catch (e) {
      // Duplicate key means someone already booked this slot (partial unique index)
      if (e?.code === 11000) throw badRequest("This time is already booked");
      throw e;
    }
  })
);

// User: cancel own reservation
reservationsRouter.delete(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "cancelled" },
      { new: true }
    );
    if (!reservation) throw notFound("Reservation not found");
    res.json({ reservation });
  })
);

// Admin: confirm reservation
reservationsRouter.patch(
  "/:id/confirm",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status: "confirmed" },
      { new: true }
    );
    if (!reservation) throw notFound("Reservation not found");
    res.json({ reservation });
  })
);

// Admin: delete reservation (hard delete)
reservationsRouter.delete(
  "/:id/admin",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) throw notFound("Reservation not found");
    res.json({ ok: true });
  })
);

