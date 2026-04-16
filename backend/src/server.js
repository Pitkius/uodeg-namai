import express from "express";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import { env, assertEnv } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { Reservation } from "./models/Reservation.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { slotsRouter } from "./routes/slots.js";
import { reservationsRouter } from "./routes/reservations.js";
import { uploadsRouter } from "./routes/uploads.js";
import { contactRouter } from "./routes/contact.js";

async function bootstrap() {
  assertEnv();
  await connectDb(env.mongoUri, { allowMemoryDbFallback: env.allowMemoryDbFallback });

  try {
    await Reservation.syncIndexes();
    // eslint-disable-next-line no-console
    console.log("Reservation indexes synced");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Reservation.syncIndexes failed:", e?.message || e);
  }

  const app = express();
  // Behind Hostinger / reverse proxy so rate-limit can read X-Forwarded-For safely
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (env.clientOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true
    })
  );

  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: 200
    })
  );

  app.use(morgan("dev"));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  // Static uploads
  const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "uploads");
  app.use(
    "/uploads",
    (req, res, next) => {
      // Frontend runs on another origin (localhost:5173), so allow image embedding.
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      next();
    },
    express.static(uploadsDir)
  );

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/slots", slotsRouter);
  app.use("/api/reservations", reservationsRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/contact", contactRouter);

  app.use(errorHandler);

  const backendSrcDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.resolve(backendSrcDir, "..");
  const repoRoot = path.resolve(backendRoot, "..");
  const cwd = process.cwd();
  const frontendDistCandidates = [
    path.join(backendRoot, "public", "app"),
    path.join(cwd, "public", "app"),
    path.join(cwd, "backend", "public", "app"),
    path.join(repoRoot, "frontend", "dist")
  ];
  const frontendDist =
    frontendDistCandidates.find((dir) => fs.existsSync(path.join(dir, "index.html"))) || frontendDistCandidates[0];
  const spaIndex = path.join(frontendDist, "index.html");

  if (!fs.existsSync(spaIndex)) {
    // eslint-disable-next-line no-console
    console.error(
      "[spa] Missing built frontend. Expected index.html at one of:\n",
      frontendDistCandidates.map((p) => `  - ${p}`).join("\n"),
      `\n  cwd=${cwd}\n`,
      "Run from repo root: npm run build  (or Hostinger: root dir = repo root, Build = npm run build)"
    );
  }

  if (fs.existsSync(spaIndex)) {
    const faviconIco = path.join(frontendDist, "favicon.ico");
    const logoPng = path.join(frontendDist, "logo.png");
    // Crawlers request /favicon.ico first; SPA fallback must not return HTML here.
    app.get("/favicon.ico", (_req, res, next) => {
      const file = fs.existsSync(faviconIco) ? faviconIco : logoPng;
      if (!fs.existsSync(file)) return next();
      // favicon.ico is PNG bytes (from public/); correct MIME helps Google pick it up.
      res.type("image/png");
      res.set("Cache-Control", "public, max-age=86400");
      return res.sendFile(file);
    });

    app.use(express.static(frontendDist, { index: false }));
    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (req.path.startsWith("/api")) return next();
      if (req.path.startsWith("/uploads")) return next();
      return res.sendFile(spaIndex);
    });
  }

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on port ${env.port} (public URL is your Hostinger/domain endpoint, not localhost)`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Server bootstrap failed:", e?.message || e);
  process.exit(1);
});


