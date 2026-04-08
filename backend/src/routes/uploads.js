import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import multer from "multer";
import sharp from "sharp";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { badRequest } from "../utils/httpError.js";

export const uploadsRouter = express.Router();

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const dir = path.join(uploadsRoot, "users", req.user._id.toString());
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e);
    }
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only images allowed"));
    cb(null, true);
  }
});

/** Resize + JPEG compress so uploads stay small; on failure keeps original file. */
async function optimizePhotoFile(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, ext);
  const finalFilename = `${base}.jpg`;
  const finalPath = path.join(dir, finalFilename);
  const tmpPath = path.join(dir, `.opt-${Date.now()}.jpg`);

  await sharp(inputPath)
    .rotate()
    .resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(tmpPath);

  if (inputPath !== finalPath) {
    await fs.unlink(inputPath).catch(() => {});
  } else {
    await fs.unlink(inputPath);
  }
  await fs.rename(tmpPath, finalPath);

  return { path: finalPath, filename: finalFilename };
}

uploadsRouter.post(
  "/photo",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded");

    try {
      const opt = await optimizePhotoFile(req.file.path);
      req.file.path = opt.path;
      req.file.filename = opt.filename;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Photo optimize skipped:", e?.message || e);
    }

    const relative = path
      .relative(uploadsRoot, req.file.path)
      .split(path.sep)
      .join("/");
    const url = `/uploads/${relative}`;

    const photo = { filename: req.file.filename, url, uploadedAt: new Date() };
    await User.updateOne({ _id: req.user._id }, { $push: { photos: photo } });

    const user = await User.findById(req.user._id).select("_id name email role photos");
    res.status(201).json({
      photo,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, photos: user.photos }
    });
  })
);

uploadsRouter.delete(
  "/photo/:filename",
  requireAuth,
  asyncHandler(async (req, res) => {
    const filename = String(req.params.filename || "").trim();
    if (!filename) throw badRequest("Invalid filename");

    const user = await User.findById(req.user._id).select("_id name email role photos");
    if (!user) throw badRequest("User not found");

    const has = Array.isArray(user.photos) && user.photos.some((p) => p.filename === filename);
    if (!has) throw badRequest("Photo not found");

    await User.updateOne({ _id: user._id }, { $pull: { photos: { filename } } });

    const filePath = path.join(uploadsRoot, "users", user._id.toString(), filename);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      // ignore missing file on disk
      if (e?.code !== "ENOENT") throw e;
    }

    const updated = await User.findById(user._id).select("_id name email role photos");
    res.json({
      ok: true,
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        photos: updated.photos
      }
    });
  })
);


