import express from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin, isSuperAdminEmail } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { badRequest } from "../utils/httpError.js";
import { passwordSchemaRefine } from "../utils/passwordPolicy.js";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireAdmin);

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdminEmail(req.user?.email)) {
    return next(badRequest("Tik pagrindinis adminas gali valdyti adminus"));
  }
  return next();
}

adminRouter.get(
  "/admins",
  asyncHandler(async (req, res) => {
    const admins = await User.find({ role: "admin" })
      .select("_id name email createdAt")
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      admins,
      isSuperAdmin: isSuperAdminEmail(req.user.email)
    });
  })
);

const createAdminSchema = z
  .object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(200)
  })
  .superRefine((data, ctx) => passwordSchemaRefine(data.password, ctx));

adminRouter.post(
  "/admins",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message || "Invalid data");

    const name = parsed.data.name.trim();
    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    const existing = await User.findOne({ email }).select("_id role");
    if (existing) {
      const passwordHash = await bcrypt.hash(password, 12);
      await User.updateOne(
        { _id: existing._id },
        {
          $set: { name, role: "admin", passwordHash },
          $inc: { tokenVersion: 1 }
        }
      );
      const admin = await User.findById(existing._id).select("_id name email role").lean();
      return res.json({ admin, updated: true });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await User.create({ name, email, passwordHash, role: "admin" });
    return res.status(201).json({
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
      updated: false
    });
  })
);

adminRouter.delete(
  "/admins/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const target = await User.findById(req.params.id).select("_id email role").lean();
    if (!target) throw badRequest("Admin nerastas");
    if (isSuperAdminEmail(target.email)) {
      throw badRequest("Negalima istrinti pagrindinio admino");
    }
    await User.updateOne({ _id: target._id }, { $set: { role: "user" }, $inc: { tokenVersion: 1 } });
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/contact-messages",
  asyncHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit || 100);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 100;
    const messages = await ContactMessage.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ messages });
  })
);

adminRouter.patch(
  "/contact-messages/:id/read",
  asyncHandler(async (req, res) => {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { $set: { isRead: true } },
      { new: true }
    ).lean();
    if (!message) throw badRequest("Zinute nerasta");
    res.json({ message });
  })
);
