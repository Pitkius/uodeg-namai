import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized, forbidden } from "../utils/httpError.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(unauthorized("Missing token"));

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select("_id name email role photos");
    if (!user) return next(unauthorized("User not found"));
    req.user = user;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") return next(forbidden());
  next();
}

