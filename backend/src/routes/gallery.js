import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import crypto from "crypto";
import multer from "multer";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { env } from "../config/env.js";
import { GalleryImage } from "../models/GalleryImage.js";
import { optimizePhotoFile } from "../utils/optimizePhoto.js";
import { badRequest, notFound } from "../utils/httpError.js";

export const galleryRouter = express.Router();

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");
const galleryDir = path.join(uploadsRoot, "gallery");

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(galleryDir, { recursive: true });
      cb(null, galleryDir);
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

function resolveSafeGalleryFile(filename) {
  const base = path.basename(String(filename || ""));
  if (!base || base !== String(filename)) return null;
  const resolved = path.resolve(galleryDir, base);
  const root = path.resolve(galleryDir);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) return null;
  return resolved;
}

/** Public list — newest first, then sortOrder. */
galleryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const images = await GalleryImage.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .select("_id filename url caption sortOrder createdAt")
      .lean();
    res.json({ images });
  })
);

/** Public image file. */
galleryRouter.get(
  "/file/:filename",
  asyncHandler(async (req, res) => {
    const filePath = resolveSafeGalleryFile(path.basename(req.params.filename));
    if (!filePath) throw badRequest("Invalid path");

    try {
      await fs.access(filePath);
    } catch {
      throw notFound("File not found");
    }

    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    return res.sendFile(filePath);
  })
);

/** Admin upload. */
galleryRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  upload.single("photo"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No file uploaded");

    const count = await GalleryImage.countDocuments();
    if (count >= env.maxGalleryPhotos) {
      await fs.unlink(req.file.path).catch(() => {});
      throw badRequest(`Galerijoje galima turėti daugiausia ${env.maxGalleryPhotos} nuotraukų`);
    }

    try {
      const opt = await optimizePhotoFile(req.file.path);
      req.file.path = opt.path;
      req.file.filename = opt.filename;
    } catch {
      await fs.unlink(req.file.path).catch(() => {});
      throw badRequest("Netinkamas paveikslėlis. Įkelkite tikras nuotraukas (JPG/PNG/WebP).");
    }

    const caption = String(req.body?.caption || "").trim().slice(0, 200);
    const url = `/api/gallery/file/${req.file.filename}`;

    const image = await GalleryImage.create({
      filename: req.file.filename,
      url,
      caption,
      sortOrder: count,
      uploadedBy: req.user._id
    });

    res.status(201).json({
      image: {
        _id: image._id,
        filename: image.filename,
        url: image.url,
        caption: image.caption,
        sortOrder: image.sortOrder,
        createdAt: image.createdAt
      }
    });
  })
);

/** Admin update caption. */
galleryRouter.patch(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const caption = String(req.body?.caption || "").trim().slice(0, 200);
    const image = await GalleryImage.findByIdAndUpdate(
      req.params.id,
      { $set: { caption } },
      { new: true }
    ).select("_id filename url caption sortOrder createdAt");
    if (!image) throw notFound("Nuotrauka nerasta");
    res.json({ image });
  })
);

/** Admin delete. */
galleryRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const image = await GalleryImage.findById(req.params.id);
    if (!image) throw notFound("Nuotrauka nerasta");

    await GalleryImage.deleteOne({ _id: image._id });

    const filePath = resolveSafeGalleryFile(image.filename);
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (e) {
        if (e?.code !== "ENOENT") throw e;
      }
    }

    res.json({ ok: true });
  })
);
