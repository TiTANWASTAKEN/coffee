import type { ErrorRequestHandler } from "express";
import multer from "multer";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const notFound = (message = "Not found") => new HttpError(404, message);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller." : err.message;
    res.status(400).json({ error: message });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.expose ? err.message : "Request failed." });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
};

// ---------- Input helpers ----------

export function str(value: unknown, field: string, { max = 500, optional = false } = {}): string {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text && !optional) throw badRequest(`${field} is required.`);
  if (text.length > max) throw badRequest(`${field} is too long.`);
  return text;
}

export function int(value: unknown, field: string, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}): number {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`${field} must be a whole number between ${min} and ${max}.`);
  }
  return n;
}

export function idParam(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw notFound();
  return n;
}
