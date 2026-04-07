import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import { signAccessToken } from "../utils/authTokens.js";
import { requireAuth } from "../middleware/auth.js";
import { sendPasswordChangedEmail, sendPasswordResetCodeEmail, sendWelcomeEmail } from "../utils/mailer.js";

export const authRouter = express.Router();

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200)
});

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message || "Invalid data");

    const { name, email, password } = parsed.data;
    const exists = await User.findOne({ email: email.toLowerCase() }).select("_id");
    if (exists) throw badRequest("Email already in use");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Welcome email failed:", e?.message || e);
    }

    const token = signAccessToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, photos: user.photos }
    });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const requestResetCodeSchema = z.object({
  email: z.string().email()
});

const confirmResetSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(200)
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest("Invalid email or password");

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw unauthorized("Invalid email or password");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");

    const token = signAccessToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, photos: user.photos }
    });
  })
);

authRouter.post(
  "/reset-password/request-code",
  asyncHandler(async (req, res) => {
    const parsed = requestResetCodeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || "Invalid data");
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) return res.json({ ok: true });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");

    user.resetCodeHash = codeHash;
    user.resetCodeExpiresAt = new Date(Date.now() + env.resetCodeTtlMinutes * 60 * 1000);
    await user.save();

    await sendPasswordResetCodeEmail(user.email, code);

    return res.json({ ok: true });
  })
);

authRouter.post(
  "/reset-password/confirm",
  asyncHandler(async (req, res) => {
    const parsed = confirmResetSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || "Invalid reset password data");
    }

    const { email, code, newPassword } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
      throw badRequest("Neteisingas arba nebegaliojantis kodas");
    }

    if (user.resetCodeExpiresAt.getTime() < Date.now()) {
      user.resetCodeHash = "";
      user.resetCodeExpiresAt = null;
      await user.save();
      throw badRequest("Kodas nebegalioja");
    }

    const incomingHash = crypto.createHash("sha256").update(code).digest("hex");
    if (incomingHash !== user.resetCodeHash) {
      throw badRequest("Neteisingas arba nebegaliojantis kodas");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetCodeHash = "";
    user.resetCodeExpiresAt = null;
    await user.save();
    try {
      await sendPasswordChangedEmail(user.email, user.name);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Password changed email failed:", e?.message || e);
    }

    return res.json({ ok: true });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        photos: req.user.photos
      }
    });
  })
);

