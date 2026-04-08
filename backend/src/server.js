import express from "express";
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
      origin: env.clientOrigin,
      credentials: true
    })
  );

  app.use(
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

  app.use(errorHandler);

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


