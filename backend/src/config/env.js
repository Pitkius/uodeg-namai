import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  maxUploadMb: process.env.MAX_UPLOAD_MB ? Number(process.env.MAX_UPLOAD_MB) : 5,
  superAdminEmail: (process.env.SUPER_ADMIN_EMAIL || "pytka4101@gmail.com").toLowerCase().trim(),
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || "",
  resetCodeTtlMinutes: process.env.RESET_CODE_TTL_MINUTES ? Number(process.env.RESET_CODE_TTL_MINUTES) : 10,
  allowMemoryDbFallback: process.env.ALLOW_MEMORY_DB_FALLBACK === "true"
};

export function assertEnv() {
  const missing = [];
  if (!env.mongoUri) missing.push("MONGODB_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

