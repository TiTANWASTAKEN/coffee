import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import { coffeeSlugs } from "../shared/coffeeSlugs.ts";
import { config } from "./config";
import "./db";
import { errorHandler, notFound } from "./http";
import { razorpayConfigured } from "./razorpay";
import { emailConfigured } from "./email";
import { accountRouter } from "./routes/account";
import { adminRouter } from "./routes/admin";
import { razorpayWebhook, storeRouter } from "./routes/store";
import { waitlistRouter } from "./routes/waitlist";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.post("/api/webhooks/razorpay", ...razorpayWebhook);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/uploads", express.static(config.uploadsDir, { immutable: true, maxAge: "1y", fallthrough: false }));

app.use("/api/admin", adminRouter);
app.use("/api/waitlist", waitlistRouter);
if (config.siteVersion === "v2") app.use("/api/account", accountRouter);
if (config.siteVersion !== "v0") app.use("/api", storeRouter);
app.use("/api", () => {
  throw notFound();
});

// In production the same server also serves the built React app.
const indexHtml = path.join(config.distDir, "index.html");

function prerenderedHtml(requestPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.includes("\0")) return null;
  const root = path.resolve(config.distDir);
  const candidate = path.resolve(root, `.${decoded}`, "index.html");
  const relative = path.relative(root, candidate);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return existsSync(candidate) ? candidate : null;
}
if (existsSync(indexHtml)) {
  const editorial = new Set<string>(coffeeSlugs);
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.length > 1 && req.path.endsWith("/")) {
      const stripped = req.path.replace(/\/+$/, "");
      const shopSlug = /^\/shop\/([^/]+)$/.exec(stripped)?.[1];
      if (prerenderedHtml(stripped) || (shopSlug !== undefined && editorial.has(shopSlug))) {
        res.redirect(301, stripped);
        return;
      }
    }
    next();
  });
  app.get("/sitemap.xml", (_req, res) => {
    res.sendFile(path.join(config.distDir, "sitemap.xml"), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
  });
  app.get("/robots.txt", (_req, res) => {
    res.sendFile(path.join(config.distDir, "robots.txt"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  });
  app.get("/shop/:slug", (req, res, next) => {
    const slug = req.params.slug;
    if (typeof slug === "string" && editorial.has(slug)) {
      res.redirect(301, `/coffee/${slug}`);
      return;
    }
    next();
  });
  app.use(express.static(config.distDir, { index: false, redirect: false, maxAge: "1h" }));
  app.get("/{*path}", (req, res) => {
    res.sendFile(prerenderedHtml(req.path) ?? indexHtml);
  });
}

app.use(errorHandler);

app.listen(config.port, (err) => {
  if (err) {
    const inUse = (err as NodeJS.ErrnoException).code === "EADDRINUSE";
    console.error(inUse ? `Port ${config.port} is already in use — another copy of the server is probably still running. Stop it and try again.` : err);
    process.exit(1);
  }
  console.log(`API ready on http://localhost:${config.port}`);
  console.log(
    config.siteVersion === "v0"
      ? "SITE_VERSION=v0 — public site is the waitlist. Signups are stored for /admin."
      : config.siteVersion === "v2"
        ? "SITE_VERSION=v2 — direct store is on, including the customer account API."
        : "SITE_VERSION=v1 — direct store is on. Customer accounts are off. Admin stays on.",
  );
  if (!emailConfigured) console.warn("RESEND_API_KEY / EMAIL_FROM not set — emails (password resets) are printed here instead of sent.");
  if (config.testPayments) console.warn("TEST_PAYMENTS is on — checkout shows simulate-payment buttons. Turn it off before going live.");
  if (!razorpayConfigured && !config.codEnabled && !config.upi.vpa) {
    console.warn("No payment method is configured — checkout will refuse orders until Razorpay, COD_ENABLED, or UPI_VPA is set.");
  }
  if (!config.shipping.configured) console.warn("SHIPPING_PAISE is unset — checkout shows shipping as not configured and charges ₹0.");
  if (config.supportEmail.endsWith("@yourdomain.com")) console.warn("SUPPORT_EMAIL is still the placeholder. Set it before launch.");
  if (config.supabase.url && config.supabase.serviceRoleKey) console.log("Waitlist storage: Supabase.");
  else if (config.siteVersion === "v0") console.warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — waitlist emails are stored in the local database only.");
});
