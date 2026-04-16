import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/httpError.js";
import { ContactMessage } from "../models/ContactMessage.js";
import { sendContactMessageEmail } from "../utils/mailer.js";

export const contactRouter = express.Router();

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10).max(3000)
});

contactRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || "Neteisingi kontaktinės formos duomenys");
    }

    const payload = {
      name: parsed.data.name.trim(),
      email: parsed.data.email.toLowerCase().trim(),
      phone: String(parsed.data.phone || "").trim(),
      message: parsed.data.message.trim()
    };

    const saved = await ContactMessage.create(payload);
    await sendContactMessageEmail(payload);

    res.status(201).json({
      ok: true,
      messageId: saved._id
    });
  })
);
