import { HttpError } from "../utils/httpError.js";

export function errorHandler(err, req, res, next) {
  let status = err instanceof HttpError ? err.status : 500;
  let message =
    err instanceof HttpError
      ? err.message
      : "Server error. Please try again later.";

  // Multer: file too large
  if (err?.code === "LIMIT_FILE_SIZE" || err?.message === "File too large") {
    status = 413;
    message = "Failas per didelis. Pabandyk mažesnę nuotrauką arba padidink MAX_UPLOAD_MB serveryje.";
  }

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

