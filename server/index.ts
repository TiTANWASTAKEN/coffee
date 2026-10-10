import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import cookieParser from "cookie-parser";
import { config } from "./config";
import "./db";
import { errorHandler, notFound } from "./http";
import { razorpayConfigured } from "./razorpay";
import { emailConfigured } from "./email";
import { accountRouter } from "./routes/account";
import { adminRouter } from "./routes/admin";
import { razorpayWebhook, storeRouter } from "./routes/store";

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.post("/api/webhooks/razorpay", ...razorpayWebhook);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.use("/uploads", express.static(config.uploadsDir, { immutable: true, maxAge: "1y", fallthrough: false }));

app.use("/api/admin", adminRouter);
if (config.siteVersion === "v2") {
  app.use("/api/account", accountRouter);
  app.use("/api", storeRouter);
}
app.use("/api", () => {
  throw notFound();
});

// In production the same server also serves the built React app.
const indexHtml = path.join(config.distDir, "index.html");
if (existsSync(indexHtml)) {
  app.use(express.static(config.distDir, { index: false, maxAge: "1h" }));
  app.get("/{*path}", (_req, res) => res.sendFile(indexHtml));
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
    config.siteVersion === "v2"
      ? "SITE_VERSION=v2 — direct store (shop, cart, checkout, accounts) is on."
      : "SITE_VERSION=v1 — Amazon-only site; store and account APIs are off.",
  );
  if (!emailConfigured) console.warn("RESEND_API_KEY / EMAIL_FROM not set — emails (password resets) are printed here instead of sent.");
  if (config.testPayments) console.warn("TEST_PAYMENTS is on — checkout shows simulate-payment buttons. Turn it off before going live.");
  if (!razorpayConfigured) console.warn("Razorpay keys are missing — checkout will be disabled until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.");
});
