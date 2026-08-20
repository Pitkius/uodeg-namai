import mongoose from "mongoose";
import crypto from "crypto";

const chatThreadSchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true, trim: true, maxlength: 120 },
    guestEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    guestPhone: { type: String, trim: true, maxlength: 40, default: "" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    /** Secret for guests to continue the thread without login */
    visitorTokenHash: { type: String, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    /** Public-facing admin name shown to visitor (Ernesta / Patricija / Pijus) */
    assignedAdminDisplayName: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    lastVisitorMessageAt: { type: Date, default: null },
    unreadByAdmin: { type: Boolean, default: true }
  },
  { timestamps: true }
);

chatThreadSchema.index({ lastMessageAt: -1 });
chatThreadSchema.index({ visitorTokenHash: 1 });
chatThreadSchema.index({ userId: 1, updatedAt: -1 });

const chatMessageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
      index: true
    },
    senderRole: { type: String, enum: ["visitor", "admin"], required: true },
    senderAdminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 4000 }
  },
  { timestamps: true }
);

chatMessageSchema.index({ threadId: 1, createdAt: 1 });

export function hashVisitorToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function createVisitorToken() {
  return crypto.randomBytes(32).toString("hex");
}

export const ChatThread = mongoose.model("ChatThread", chatThreadSchema);
export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
