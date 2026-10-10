import type { CookieOptions, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { getCustomerById, type CustomerRow } from "./customers";
import { HttpError } from "./http";

const COOKIE = "ht_customer";
const SESSION_DAYS = 30;

function cookieOptions(req: Request): CookieOptions {
  // Lax so the session survives arriving from an email link.
  return { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" };
}

export function startCustomerSession(req: Request, res: Response, customer: CustomerRow): void {
  const token = jwt.sign({ sub: String(customer.id), role: "customer", v: customer.session_version }, config.jwtSecret, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie(COOKIE, token, { ...cookieOptions(req), maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

export function endCustomerSession(req: Request, res: Response): void {
  res.clearCookie(COOKIE, cookieOptions(req));
}

/** The signed-in customer, or null. Sessions die when the password changes. */
export function currentCustomer(req: Request): CustomerRow | null {
  const token = req.cookies?.[COOKIE];
  if (typeof token !== "string") return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (payload.role !== "customer") return null;
    const customer = getCustomerById(Number(payload.sub));
    return customer && customer.session_version === payload.v ? customer : null;
  } catch {
    return null;
  }
}

export const requireCustomer: RequestHandler = (req, res, next) => {
  const customer = currentCustomer(req);
  if (!customer) throw new HttpError(401, "Please sign in.");
  res.locals.customer = customer;
  next();
};
