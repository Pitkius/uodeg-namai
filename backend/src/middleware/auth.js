import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized, forbidden } from "../utils/httpError.js";
import { readTokenFromRequest } from "../utils/authTokens.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  const token = readTokenFromRequest(req);
  if (!token) return next(unauthorized("Missing token"));

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select(
      "_id name email role photos tokenVersion"
    );
    if (!user) return next(unauthorized("User not found"));
    if ((user.tokenVersion || 0) !== (payload.tv || 0)) {
      return next(unauthorized("Invalid or expired token"));
    }
    req.user = user;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

/** Attaches req.user when a valid token is present; never fails. */
export async function optionalAuth(req, res, next) {
  const token = readTokenFromRequest(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select(
      "_id name email role photos tokenVersion"
    );
    if (user && (user.tokenVersion || 0) === (payload.tv || 0)) {
      req.user = user;
    }
  } catch {
    // ignore
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") return next(forbidden());
  next();
}

export function isSuperAdminEmail(email) {
  if (!env.superAdminEmail) return false;
  return String(email || "").toLowerCase().trim() === env.superAdminEmail;
}
