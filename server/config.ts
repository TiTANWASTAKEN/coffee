import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  // No .env file — rely on the real environment.
}

const rootDir = path.resolve(import.meta.dirname, "..");
const dataDir = path.resolve(rootDir, process.env.DATA_DIR ?? "data");
const uploadsDir = path.join(dataDir, "uploads");
mkdirSync(uploadsDir, { recursive: true });

const isProduction = process.env.NODE_ENV === "production";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
  return value;
}

let jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret) {
  if (isProduction) throw new Error("Missing JWT_SECRET.");
  jwtSecret = randomBytes(32).toString("hex");
  console.warn("JWT_SECRET is not set — admin sessions will reset whenever the server restarts.");
}

const siteVersion = process.env.SITE_VERSION?.trim() || "v1";
if (siteVersion !== "v1" && siteVersion !== "v2") throw new Error(`SITE_VERSION must be "v1" or "v2" (got "${siteVersion}").`);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  rootDir,
  dataDir,
  uploadsDir,
  distDir: path.join(rootDir, "dist"),
  storeName: process.env.STORE_NAME ?? "Bitter Truth Coffee",
  /** Used to build links in emails. Never derived from request headers. */
  publicUrl: (process.env.PUBLIC_URL?.trim() || "http://localhost:5173").replace(/\/+$/, ""),
  email: {
    resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    from: process.env.EMAIL_FROM?.trim() ?? "",
  },
  admin: {
    email: required("ADMIN_EMAIL").toLowerCase(),
    password: required("ADMIN_PASSWORD"),
  },
  jwtSecret,
  /** v1 = Amazon-only site (store API off), v2 = direct store. Same setting the site is built with. */
  siteVersion,
  /** Shows "simulate payment" buttons at checkout. Never allowed with live Razorpay keys. */
  testPayments: process.env.TEST_PAYMENTS === "true" && !process.env.RAZORPAY_KEY_ID?.trim().startsWith("rzp_live_"),
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() ?? "",
  },
};
