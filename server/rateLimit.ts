import type { Request, RequestHandler } from "express";
import { HttpError } from "./http";

interface Limiter extends RequestHandler {
  reset: (req: Request) => void;
}

/** Small in-memory, per-IP limiter. Fine for a single server process. */
export function rateLimit({ max, windowMinutes, message }: { max: number; windowMinutes: number; message: string }): Limiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const windowMs = windowMinutes * 60 * 1000;

  const limiter = ((req, _res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt < now) hits.delete(k);
    } else if (++entry.count > max) {
      throw new HttpError(429, message);
    }
    next();
  }) as Limiter;

  limiter.reset = (req) => hits.delete(req.ip ?? "unknown");
  return limiter;
}
