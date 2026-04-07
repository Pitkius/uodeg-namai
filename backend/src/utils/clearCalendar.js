import { env, assertEnv } from "../config/env.js";
import { connectDb } from "../config/db.js";
import { Reservation } from "../models/Reservation.js";
import { AvailabilitySlot } from "../models/AvailabilitySlot.js";

/**
 * Išvalo kalendoriaus duomenis: visas rezervacijas ir apsistojimo slotus.
 * Paleisk: npm run clear:calendar (iš backend aplanko, su .env)
 */
assertEnv();
await connectDb(env.mongoUri);

const res = await Reservation.deleteMany({});
const slots = await AvailabilitySlot.deleteMany({});

// eslint-disable-next-line no-console
console.log(
  `Išvalyta: rezervacijų — ${res.deletedCount}, slotų — ${slots.deletedCount}.`
);
process.exit(0);
