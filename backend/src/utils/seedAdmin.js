import bcrypt from "bcryptjs";
import { env, assertEnv } from "../config/env.js";
import { connectDb } from "../config/db.js";
import { User } from "../models/User.js";

assertEnv();
await connectDb(env.mongoUri);

const email = process.env.ADMIN_EMAIL || "admin@suniukai.local";
const password = process.env.ADMIN_PASSWORD || "Admin12345!";
const name = process.env.ADMIN_NAME || "Admin";

const existing = await User.findOne({ email }).select("_id role");
if (existing) {
  const passwordHash = await bcrypt.hash(password, 12);
  await User.updateOne(
    { _id: existing._id },
    { $set: { role: "admin", name, passwordHash } }
  );
  // eslint-disable-next-line no-console
  console.log(`Admin ready: ${email} (updated name/password if provided)`);
  process.exit(0);
}

const passwordHash = await bcrypt.hash(password, 12);
await User.create({ name, email, passwordHash, role: "admin" });
// eslint-disable-next-line no-console
console.log(`Admin created: ${email} / ${password}`);
process.exit(0);

