import type { AdminStats } from "../../shared/store";
import { checkCredentials, createAdminToken, readAdminToken } from "../../server/auth";
import { HttpError } from "../../server/http";
import { WaitlistStorageError } from "../../server/supabaseWaitlist";
import { readEmail } from "../../server/validate";
import { loadWaitlist, saveWaitlistEmail, waitlistUsesSupabase } from "../../server/waitlistStore";

const COOKIE = "ht_admin";
const WEEK = 7 * 24 * 60 * 60;

const hits = new Map<string, { count: number; resetAt: number }>();

function limited(key: string, max: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

function clientIp(req: Request): string {
  return req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function apiPath(req: Request): string {
  const path = new URL(req.url).pathname;
  const marker = "/.netlify/functions/api";
  const raw = path.startsWith(marker) ? `/api${path.slice(marker.length)}` : path;
  return raw.length > 1 && raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function cookieValue(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

function json(status: number, body: unknown, setCookie?: string): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  if (setCookie) headers.set("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}

function sessionCookie(token: string, secure: boolean, maxAge: number): string {
  const parts = [`${COOKIE}=${token}`, "HttpOnly", "Path=/", "SameSite=Strict", `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

const emptyStats: AdminStats = {
  revenue: 0,
  refunded: 0,
  pendingValue: 0,
  codOutstanding: 0,
  paidOrders: 0,
  pendingOrders: 0,
  awaitingVerification: 0,
  unfulfilledOrders: 0,
  shippedOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  products: 0,
  lowStock: [],
  recentOrders: [],
};

async function handle(req: Request): Promise<Response> {
  const path = apiPath(req);
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  const admin = readAdminToken(cookieValue(req, COOKIE));

  if (req.method === "POST" && path === "/api/waitlist") {
    if (limited(`waitlist:${clientIp(req)}`, 8)) return json(429, { error: "Too many attempts. Try again in a few minutes." });
    if (!waitlistUsesSupabase()) return json(503, { error: "Waitlist storage is not configured." });
    const body = (await req.json()) as { email?: unknown };
    const status = await saveWaitlistEmail(readEmail(body.email));
    return json(status === "added" ? 201 : 200, { ok: true, already: status === "exists" });
  }

  if (req.method === "POST" && path === "/api/admin/login") {
    if (limited(`login:${clientIp(req)}`, 10)) return json(429, { error: "Too many sign-in attempts. Try again in 15 minutes." });
    const body = (await req.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!checkCredentials(email, password)) return json(401, { error: "Incorrect email or password." });
    return json(200, { email }, sessionCookie(createAdminToken(), secure, WEEK));
  }

  if (req.method === "POST" && path === "/api/admin/logout") {
    return json(200, { ok: true }, sessionCookie("", secure, 0));
  }

  if (path.startsWith("/api/admin")) {
    if (!admin) return json(401, { error: "Please sign in." });
    if (req.method === "GET" && path === "/api/admin/me") return json(200, { email: admin });
    if (req.method === "GET" && path === "/api/admin/waitlist") {
      if (!waitlistUsesSupabase()) return json(503, { error: "Waitlist storage is not configured." });
      return json(200, await loadWaitlist());
    }
    if (req.method === "GET" && path === "/api/admin/stats") return json(200, emptyStats);
    return json(404, { error: "That admin page needs the store server. The waitlist is available here." });
  }

  return json(404, { error: "Not found." });
}

export default async (req: Request): Promise<Response> => {
  try {
    return await handle(req);
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message });
    if (err instanceof WaitlistStorageError) return json(503, { error: err.message });
    if (err instanceof SyntaxError) return json(400, { error: "Invalid JSON body." });
    console.error(err);
    return json(500, { error: "Something went wrong." });
  }
};
