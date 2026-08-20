import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import crypto from "crypto";
import multer from "multer";
import sharp from "sharp";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { badRequest, forbidden, notFound } from "../utils/httpError.js";

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
    const ext = path.extname(file.originalname || "").toLowerCase().replace(/[^a-z0-9.]/g, "");
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic"].includes(ext) ? ext : ".img";
    cb(null, `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${safeExt}`);
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

/** Resize + JPEG compress; throws if file is not a real image. */
async function optimizePhotoFile(inputPath) {
  const meta = await sharp(inputPath).metadata();
  if (!meta.format || meta.format === "svg") {
    throw new Error("Unsupported or invalid image");
  }

  const dir = path.dirname(inputPath);
  const finalFilename = `${path.basename(inputPath, path.extname(inputPath))}.jpg`;
  const finalPath = path.join(dir, finalFilename);
  const tmpPath = path.join(dir, `.opt-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`);

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
    await fs.unlink(inputPath).catch(() => {});
  }
  await fs.rename(tmpPath, finalPath);

  return { path: finalPath, filename: finalFilename };
}

function userPhotoDir(userId) {
  return path.join(uploadsRoot, "users", String(userId));
}

function resolveSafeUserFile(userId, filename) {
  const base = path.basename(String(filename || ""));
  if (!base || base !== String(filename)) return null;
  const dir = userPhotoDir(userId);
  const resolved = path.resolve(dir, base);
  if (!resolved.startsWith(path.resolve(dir) + path.sep) && resolved !== path.resolve(dir)) {
    return null;
  }
  return resolved;
}

uploadsRouter.post(
  "/photo",
  requireAuth,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded");

    const current = await User.findById(req.user._id).select("photos");
    if ((current?.photos?.length || 0) >= env.maxUserPhotos) {
      await fs.unlink(req.file.path).catch(() => {});
      throw badRequest(`Galima ikelti daugiausia ${env.maxUserPhotos} nuotrauku`);
    }

    try {
      const opt = await optimizePhotoFile(req.file.path);
      req.file.path = opt.path;
      req.file.filename = opt.filename;
    } catch (e) {
      await fs.unlink(req.file.path).catch(() => {});
      throw badRequest("Netinkamas paveikslelis. Ikelsite tikras nuotraukas (JPG/PNG/WebP).");
    }

    const url = `/api/uploads/file/${req.user._id}/${req.file.filename}`;

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
    const filename = path.basename(String(req.params.filename || "").trim());
    if (!filename) throw badRequest("Invalid filename");

    const user = await User.findById(req.user._id).select("_id name email role photos");
    if (!user) throw badRequest("User not found");

    const has = Array.isArray(user.photos) && user.photos.some((p) => p.filename === filename);
    if (!has) throw badRequest("Photo not found");

    await User.updateOne({ _id: user._id }, { $pull: { photos: { filename } } });

    const filePath = resolveSafeUserFile(user._id, filename);
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        if (e?.code !== "ENOENT") throw e;
      }
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

/** Authenticated photo fetch (owner or admin) — replaces public static exposure. */
uploadsRouter.get(
  "/file/:userId/:filename",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId, filename } = req.params;
    const isOwner = String(req.user._id) === String(userId);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) throw forbidden();

    const filePath = resolveSafeUserFile(userId, path.basename(filename));
    if (!filePath) throw badRequest("Invalid path");

    try {
      await fs.access(filePath);
    } catch {
      throw notFound("File not found");
    }

    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    return res.sendFile(filePath);
  })
);
