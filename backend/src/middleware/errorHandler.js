import { HttpError } from "../utils/httpError.js";

export function errorHandler(err, req, res, next) {
  const status = err instanceof HttpError ? err.status : 500;
  let message =
    err instanceof HttpError
      ? err.message
      : "Server error. Please try again later.";

  if (status === 500 && err?.code === 11000) {
    message = "Šis įrašas jau egzistuoja (pasikartojantis raktas).";
  }

  if (status === 500 && err?.name === "ValidationError") {
    message = err?.message || message;
  }

  if (status === 500) {
    // eslint-disable-next-line no-console
    console.error("[500]", err?.message || err?.code || err);
  }

  const payload = { message };
  if (process.env.NODE_ENV !== "production") {
    payload.details = err?.message;
  }

  res.status(status).json(payload);
}

