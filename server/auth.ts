import { createHash, timingSafeEqual } from "node:crypto";
import type { CookieOptions, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { HttpError } from "./http";
import { rateLimit } from "./rateLimit";

const COOKIE = "ht_admin";
const SESSION_DAYS = 7;

function sameSecret(a: string, b: string): boolean {
  // Hash first so the comparison is constant-time regardless of length.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkCredentials(email: string, password: string): boolean {
  const emailOk = sameSecret(email.trim().toLowerCase(), config.admin.email);
  const passwordOk = sameSecret(password, config.admin.password);
  return emailOk && passwordOk;
}

function cookieOptions(req: Request): CookieOptions {
  return { httpOnly: true, sameSite: "strict", secure: req.secure, path: "/" };
}

export function createAdminToken(): string {
  return jwt.sign({ sub: config.admin.email, role: "admin" }, config.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
}

export function readAdminToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return payload.role === "admin" && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function startSession(req: Request, res: Response): void {
  res.cookie(COOKIE, createAdminToken(), { ...cookieOptions(req), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

export function endSession(req: Request, res: Response): void {
  res.clearCookie(COOKIE, cookieOptions(req));
}

export function sessionEmail(req: Request): string | null {
  const token = req.cookies?.[COOKIE];
  return readAdminToken(typeof token === "string" ? token : undefined);
}

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!sessionEmail(req)) throw new HttpError(401, "Please sign in.");
  next();
};

export const loginRateLimit = rateLimit({ max: 10, windowMinutes: 15, message: "Too many sign-in attempts. Try again in 15 minutes." });

export function resetLoginAttempts(req: Request): void {
  loginRateLimit.reset(req);
}
