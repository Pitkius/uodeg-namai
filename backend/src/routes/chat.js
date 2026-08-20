import express from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin, optionalAuth } from "../middleware/auth.js";
import {
  ChatThread,
  ChatMessage,
  createVisitorToken,
  hashVisitorToken
} from "../models/Chat.js";
import { User } from "../models/User.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";
import { sendChatNotifyAdmins } from "../utils/mailer.js";
import { chatLimiter, chatStartLimiter } from "../utils/rateLimits.js";

export const chatRouter = express.Router();

const startSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(4000)
});

const messageSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  visitorToken: z.string().min(20).max(200).optional()
});

function publicThread(thread) {
  return {
    id: thread._id,
    guestName: thread.guestName,
    guestEmail: thread.guestEmail,
    guestPhone: thread.guestPhone,
    status: thread.status,
    assignedAdminDisplayName: thread.assignedAdminDisplayName || "",
    lastMessageAt: thread.lastMessageAt,
    unreadByAdmin: thread.unreadByAdmin,
    createdAt: thread.createdAt
  };
}

function publicMessage(m) {
  return {
    id: m._id,
    senderRole: m.senderRole,
    displayName: m.displayName,
    body: m.body,
    createdAt: m.createdAt
  };
}

async function assertVisitorAccess(thread, visitorToken, user) {
  if (user?.role === "admin") return true;
  if (user && thread.userId && String(thread.userId) === String(user._id)) return true;
  if (visitorToken && hashVisitorToken(visitorToken) === thread.visitorTokenHash) return true;
  return false;
}

async function notifyAdmins(thread, preview) {
  const admins = await User.find({ role: "admin" }).select("email").lean();
  const emails = admins.map((a) => a.email);
  try {
    await sendChatNotifyAdmins({
      adminEmails: emails,
      guestName: thread.guestName,
      guestEmail: thread.guestEmail,
      preview,
      threadId: thread._id
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Chat notify email failed:", e?.message || e);
  }
}

chatRouter.post(
  "/threads",
  chatStartLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(parsed.error.issues[0]?.message || "Neteisingi duomenys");
    }

    const visitorToken = createVisitorToken();
    const name = parsed.data.name.trim();
    const email = parsed.data.email.toLowerCase().trim();
    const phone = String(parsed.data.phone || "").trim();
    const body = parsed.data.message.trim();

    const thread = await ChatThread.create({
      guestName: name,
      guestEmail: email,
      guestPhone: phone,
      userId: req.user?._id || null,
      visitorTokenHash: hashVisitorToken(visitorToken),
      status: "open",
      lastMessageAt: new Date(),
      lastVisitorMessageAt: new Date(),
      unreadByAdmin: true
    });

    const msg = await ChatMessage.create({
      threadId: thread._id,
      senderRole: "visitor",
      displayName: name,
      body
    });

    await notifyAdmins(thread, body);

    res.status(201).json({
      thread: publicThread(thread),
      messages: [publicMessage(msg)],
      visitorToken
    });
  })
);

chatRouter.get(
  "/threads/:id",
  chatLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const thread = await ChatThread.findById(req.params.id);
    if (!thread) throw notFound("Pokalbis nerastas");

    const visitorToken = String(req.query.token || req.headers["x-chat-token"] || "");
    const ok = await assertVisitorAccess(thread, visitorToken, req.user);
    if (!ok) throw forbidden("Neturite prieigos prie sios zinutes");

    const messages = await ChatMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).lean();
    res.json({
      thread: publicThread(thread),
      messages: messages.map(publicMessage)
    });
  })
);

chatRouter.post(
  "/threads/:id/messages",
  chatLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) throw badRequest(parsed.error.issues[0]?.message || "Neteisinga zinute");

    const thread = await ChatThread.findById(req.params.id);
    if (!thread) throw notFound("Pokalbis nerastas");
    if (thread.status === "closed") throw badRequest("Pokalbis uzdarytas");

    const visitorToken = parsed.data.visitorToken || String(req.headers["x-chat-token"] || "");
    // Admins must use /admin routes to reply (so display name / claim works)
    if (req.user?.role === "admin") {
      throw badRequest("Adminai atsako per admin skydeli");
    }

    const ok = await assertVisitorAccess(thread, visitorToken, req.user);
    if (!ok) throw forbidden("Neturite prieigos prie sios zinutes");

    const body = parsed.data.message.trim();
    const msg = await ChatMessage.create({
      threadId: thread._id,
      senderRole: "visitor",
      displayName: thread.guestName,
      body
    });

    thread.lastMessageAt = new Date();
    thread.lastVisitorMessageAt = new Date();
    thread.unreadByAdmin = true;
    await thread.save();

    await notifyAdmins(thread, body);

    res.status(201).json({ message: publicMessage(msg), thread: publicThread(thread) });
  })
);

/** Logged-in user's own threads */
chatRouter.get(
  "/mine",
  requireAuth,
  asyncHandler(async (req, res) => {
    const threads = await ChatThread.find({ userId: req.user._id })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();
    res.json({ threads: threads.map(publicThread) });
  })
);

// ——— Admin ———

chatRouter.get(
  "/admin/threads",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = String(req.query.status || "open");
    const q = status === "all" ? {} : { status };
    const threads = await ChatThread.find(q).sort({ lastMessageAt: -1 }).limit(100).lean();
    res.json({
      threads: threads.map((t) => ({
        ...publicThread(t),
        assignedAdminId: t.assignedAdminId,
        userId: t.userId
      }))
    });
  })
);

chatRouter.get(
  "/admin/threads/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const thread = await ChatThread.findById(req.params.id);
    if (!thread) throw notFound("Pokalbis nerastas");
    const messages = await ChatMessage.find({ threadId: thread._id }).sort({ createdAt: 1 }).lean();
    if (thread.unreadByAdmin) {
      thread.unreadByAdmin = false;
      await thread.save();
    }
    res.json({
      thread: {
        ...publicThread(thread),
        assignedAdminId: thread.assignedAdminId,
        userId: thread.userId
      },
      messages: messages.map(publicMessage)
    });
  })
);

chatRouter.post(
  "/admin/threads/:id/claim",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const thread = await ChatThread.findById(req.params.id);
    if (!thread) throw notFound("Pokalbis nerastas");

    thread.assignedAdminId = req.user._id;
    thread.assignedAdminDisplayName = req.user.name;
    await thread.save();

    res.json({ thread: publicThread(thread) });
  })
);

chatRouter.post(
  "/admin/threads/:id/messages",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({ message: z.string().trim().min(1).max(4000) })
      .safeParse(req.body);
    if (!parsed.success) throw badRequest("Neteisinga zinute");

    const thread = await ChatThread.findById(req.params.id);
    if (!thread) throw notFound("Pokalbis nerastas");
    if (thread.status === "closed") throw badRequest("Pokalbis uzdarytas");

    // First admin to reply "takes" the conversation — visitor sees their name
    if (!thread.assignedAdminId) {
      thread.assignedAdminId = req.user._id;
      thread.assignedAdminDisplayName = req.user.name;
    }

    const displayName = thread.assignedAdminDisplayName || req.user.name;
    const body = parsed.data.message.trim();
    const msg = await ChatMessage.create({
      threadId: thread._id,
      senderRole: "admin",
      senderAdminId: req.user._id,
      displayName,
      body
    });

    thread.lastMessageAt = new Date();
    thread.unreadByAdmin = false;
    await thread.save();

    res.status(201).json({ message: publicMessage(msg), thread: publicThread(thread) });
  })
);

chatRouter.patch(
  "/admin/threads/:id/close",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const thread = await ChatThread.findByIdAndUpdate(
      req.params.id,
      { status: "closed" },
      { new: true }
    );
    if (!thread) throw notFound("Pokalbis nerastas");
    res.json({ thread: publicThread(thread) });
  })
);
