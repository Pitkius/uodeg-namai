import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    resetCodeHash: { type: String, default: "" },
    resetCodeExpiresAt: { type: Date, default: null },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    photos: { type: [photoSchema], default: [] }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

