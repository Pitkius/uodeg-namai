import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import sharp from "sharp";

/** Resize + JPEG compress; throws if file is not a real image. */
export async function optimizePhotoFile(inputPath) {
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

  await fs.unlink(inputPath).catch(() => {});
  await fs.rename(tmpPath, finalPath);

  return { path: finalPath, filename: finalFilename };
}
