import dotenv from "dotenv";

dotenv.config();

const defaultDevOrigin = "http://localhost:5173";
const clientOriginsList = (process.env.CLIENT_ORIGIN || defaultDevOrigin)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const clientOriginsResolved = clientOriginsList.length ? clientOriginsList : [defaultDevOrigin];

const isProd = process.env.NODE_ENV === "production";

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  /** First origin is used for email links (reset, etc.) */
  clientOrigin: clientOriginsResolved[0],
  /** CORS: comma-separated list in CLIENT_ORIGIN, e.g. punycode + ASCII domain */
  clientOrigins: clientOriginsResolved,
  // Raw upload cap before sharp resize (then saved much smaller as JPEG)
  maxUploadMb: process.env.MAX_UPLOAD_MB ? Number(process.env.MAX_UPLOAD_MB) : 20,
  maxUserPhotos: process.env.MAX_USER_PHOTOS ? Number(process.env.MAX_USER_PHOTOS) : 10,
  /** Override with SUPER_ADMIN_EMAIL in production */
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || "pytka4101@gmail.com").toLowerCase().trim(),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  contactInboxEmail: process.env.CONTACT_INBOX_EMAIL || "ernesta@xn--uodegnamai-sgc.com",
  resetCodeTtlMinutes: process.env.RESET_CODE_TTL_MINUTES ? Number(process.env.RESET_CODE_TTL_MINUTES) : 10,
  allowMemoryDbFallback:
    process.env.ALLOW_MEMORY_DB_FALLBACK === "true" && process.env.NODE_ENV !== "production",
  cookieSecure: process.env.COOKIE_SECURE === "true" || isProd,
  cookieSameSite: process.env.COOKIE_SAME_SITE || (isProd ? "lax" : "lax")
};

export function assertEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push("MONGODB_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}
