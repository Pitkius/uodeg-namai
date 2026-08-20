import bcrypt from "bcryptjs";
import { env, assertEnv } from "../config/env.js";
import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

assertEnv();
await connectDb(env.mongoUri);

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Admin";

if (!email || !password) {
  // eslint-disable-next-line no-console
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars (no defaults in production scripts).");
  process.exit(1);
}

if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
  // eslint-disable-next-line no-console
  console.error("ADMIN_PASSWORD must be at least 8 chars with a letter and a number.");
  process.exit(1);
}

const existing = await User.findOne({ email: email.toLowerCase() }).select("_id role");
if (existing) {
  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { _id: existing._id },
    { $set: { role: "admin", name, passwordHash }, $inc: { tokenVersion: 1 } }
  );
  // eslint-disable-next-line no-console
  console.log(`Admin ready: ${email} (updated)`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
await User.create({ name, email: email.toLowerCase(), passwordHash, role: "admin" });
// eslint-disable-next-line no-console
console.log(`Admin created: ${email}`);
process.exit(0);
