import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { FULFILLMENT_STATES, fulfillmentLabel, type AdminStats, type Fulfillment, type PaymentStatus, type StoreProduct } from "../../shared/store";
import { checkCredentials, endSession, loginRateLimit, requireAdmin, resetLoginAttempts, sessionEmail, startSession } from "../auth";
import { canChangeFulfillment, canRefund } from "../commerce";
import { config } from "../config";
import { createCoupon, listCoupons, setCouponActive } from "../coupons";
import { addOrderUpdate, db, deleteUnpaidCheckouts, getOrder, getProductById, getReminderTemplate, listOrders, listProducts, markOrderPaidById, recordAdminEvent, releaseStock, saveReminderTemplate } from "../db";
import { badRequest, HttpError, idParam, int, notFound, str } from "../http";
import { notifyOrderOnce, resendOrderEmail } from "../notify";
import { readOrderIds, readReminderTemplate, sendPaymentReminders } from "../reminder";
import { WaitlistStorageError } from "../supabaseWaitlist";
import { loadWaitlist } from "../waitlistStore";

export const adminRouter = Router();

// ---------- Session ----------

adminRouter.post("/login", loginRateLimit, (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!checkCredentials(email, password)) throw new HttpError(401, "Incorrect email or password.");
  resetLoginAttempts(req);
  startSession(req, res);
  res.json({ email: config.admin.email });
});

adminRouter.post("/logout", (req, res) => {
  endSession(req, res);
  res.json({ ok: true });
});

adminRouter.get("/me", (req, res) => {
  const email = sessionEmail(req);
  if (!email) throw new HttpError(401, "Not signed in.");
  res.json({ email });
});

adminRouter.use(requireAdmin);

adminRouter.get("/waitlist", async (_req, res) => {
  try {
    res.json(await loadWaitlist());
  } catch (err) {
    if (err instanceof WaitlistStorageError) throw new HttpError(503, err.message);
    throw err;
  }
});

// ---------- Dashboard ----------

const LOW_STOCK = 5;

adminRouter.get("/stats", (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const stats: AdminStats = {
    revenue: count("SELECT COALESCE(SUM(amount), 0) AS n FROM orders WHERE status = 'paid' AND fulfillment != 'cancelled'"),
    refunded: count("SELECT COALESCE(SUM(amount), 0) AS n FROM orders WHERE status = 'refunded'"),
    pendingValue: count("SELECT COALESCE(SUM(amount), 0) AS n FROM orders WHERE status = 'pending' AND payment_method != 'cod'"),
    codOutstanding: count("SELECT COALESCE(SUM(amount), 0) AS n FROM orders WHERE status = 'pending' AND payment_method = 'cod'"),
    paidOrders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'"),
    pendingOrders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"),
    awaitingVerification: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending' AND payment_method = 'upi'"),
    unfulfilledOrders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid' AND fulfillment IN ('unfulfilled', 'packed')"),
    shippedOrders: count("SELECT COUNT(*) AS n FROM orders WHERE fulfillment = 'shipped'"),
    deliveredOrders: count("SELECT COUNT(*) AS n FROM orders WHERE fulfillment = 'delivered'"),
    cancelledOrders: count("SELECT COUNT(*) AS n FROM orders WHERE fulfillment = 'cancelled' OR status = 'refunded'"),
    products: count("SELECT COUNT(*) AS n FROM products"),
    lowStock: db
      .prepare("SELECT id, name, stock FROM products WHERE active = 1 AND stock <= ? ORDER BY stock, name")
      .all(LOW_STOCK) as unknown as AdminStats["lowStock"],
    recentOrders: listOrders({ limit: 8 }),
  };
  res.json(stats);
});

// ---------- Orders ----------

const PAYMENT_STATES: PaymentStatus[] = ["pending", "paid", "failed", "refunded"];

adminRouter.get("/orders", (req, res) => {
  const status = req.query.status as PaymentStatus | undefined;
  if (status && !PAYMENT_STATES.includes(status)) throw badRequest("Unknown status.");
  res.json(listOrders({ status }));
});

adminRouter.get("/settings/payment-reminder", (_req, res) => {
  res.json({ ...getReminderTemplate(), needsSetup: false });
});

adminRouter.put("/settings/payment-reminder", (req, res) => {
  const template = readReminderTemplate(req.body);
  saveReminderTemplate(template.subject, template.body);
  res.json({ ...template, needsSetup: false });
});

adminRouter.post("/orders/remind", async (req, res) => {
  const ids = readOrderIds(req.body);
  const orders = ids.map((id) => getOrder({ id })).filter((order) => order !== undefined);
  const result = await sendPaymentReminders(orders, getReminderTemplate(), (order) => recordAdminEvent(order.id, "payment_reminder", order.customer.email));
  result.skipped += ids.length - orders.length;
  if (result.sent === 0 && result.failed > 0) throw new HttpError(502, "The email provider did not accept the message.");
  if (result.sent === 0) throw badRequest("Only an unpaid online checkout can be reminded.");
  res.json(result);
});

adminRouter.post("/orders/delete-unpaid", (req, res) => {
  const ids = readOrderIds(req.body);
  const result = deleteUnpaidCheckouts(ids);
  if (result.deleted === 0) throw badRequest("Only an unpaid online checkout can be deleted.");
  res.json(result);
});

adminRouter.get("/orders/:id", (req, res) => {
  const order = getOrder({ id: idParam(req.params.id) });
  if (!order) throw notFound("Order not found.");
  res.json(order);
});

adminRouter.patch("/orders/:id", (req, res) => {
  const id = idParam(req.params.id);
  const order = getOrder({ id });
  if (!order) throw notFound("Order not found.");

  if (req.body?.fulfillment !== undefined) {
    const fulfillment = req.body.fulfillment as Fulfillment;
    if (!FULFILLMENT_STATES.includes(fulfillment)) throw badRequest("Unknown fulfilment status.");
    const problem = canChangeFulfillment(order.fulfillment, fulfillment, { status: order.status, method: order.paymentMethod });
    if (problem) throw badRequest(problem);
    if (fulfillment === "cancelled" && order.fulfillment !== "cancelled") releaseStock(order);
    const dispatchedAt = fulfillment === "shipped" || fulfillment === "out_for_delivery" ? "datetime('now')" : null;
    const deliveredAt = fulfillment === "delivered" ? "datetime('now')" : null;
    db.prepare("UPDATE orders SET fulfillment = ? WHERE id = ?").run(fulfillment, id);
    if (dispatchedAt || deliveredAt) {
      db.prepare(
        `INSERT INTO shipments (order_id, dispatched_at, delivered_at) VALUES (?, ${dispatchedAt ?? "NULL"}, ${deliveredAt ?? "NULL"})
         ON CONFLICT(order_id) DO UPDATE SET
           dispatched_at = COALESCE(shipments.dispatched_at, excluded.dispatched_at),
           delivered_at = COALESCE(excluded.delivered_at, shipments.delivered_at),
           updated_at = datetime('now')`,
      ).run(id);
    }
    if (fulfillment !== order.fulfillment) addOrderUpdate(id, fulfillmentLabel[fulfillment], "");
    recordAdminEvent(id, "fulfillment", `${order.fulfillment} → ${fulfillment}`);
  }

  if (req.body?.shipment !== undefined) {
    const body = req.body.shipment as Record<string, unknown>;
    const courier = str(body.courier, "Courier", { max: 80, optional: true });
    const trackingRef = str(body.trackingRef, "Tracking reference", { max: 80, optional: true });
    const trackingUrl = str(body.trackingUrl, "Tracking URL", { max: 300, optional: true });
    const location = str(body.location, "Where it has reached", { max: 160, optional: true });
    const note = str(body.note, "Tracking note", { max: 240, optional: true });
    if (trackingUrl && !/^https:\/\//.test(trackingUrl)) throw badRequest("Tracking URL must start with https://");
    db.prepare(
      `INSERT INTO shipments (order_id, courier, tracking_ref, tracking_url, location) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(order_id) DO UPDATE SET courier = excluded.courier, tracking_ref = excluded.tracking_ref, tracking_url = excluded.tracking_url, location = excluded.location, updated_at = datetime('now')`,
    ).run(id, courier, trackingRef, trackingUrl, location);
    if (note) addOrderUpdate(id, "Update", note);
    else if (location && location !== (order.shipment?.location ?? "")) addOrderUpdate(id, "Reached", location);
    recordAdminEvent(id, "shipment", location || note || trackingRef || courier);
  }

  res.json(getOrder({ id }));
});

adminRouter.post("/orders/:id/verify-payment", async (req, res) => {
  const id = idParam(req.params.id);
  const order = getOrder({ id });
  if (!order) throw notFound("Order not found.");
  if (order.paymentMethod === "razorpay") throw badRequest("Razorpay payments are verified from the payment signature, not by hand.");
  if (order.status === "paid") {
    res.json(order);
    return;
  }
  if (order.status !== "pending") throw badRequest("This payment can no longer be verified.");
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 200) : "";
  const paid = markOrderPaidById(id, order.paymentMethod === "upi" ? order.upiReference || note || "verified-by-admin" : "cod-collected");
  recordAdminEvent(id, "verify_payment", note || order.paymentMethod);
  if (paid) await notifyOrderOnce(paid.id);
  res.json(getOrder({ id }));
});

adminRouter.post("/orders/:id/refund", (req, res) => {
  const id = idParam(req.params.id);
  const order = getOrder({ id });
  if (!order) throw notFound("Order not found.");
  const problem = canRefund(order.status, order.fulfillment);
  if (problem) throw badRequest(problem);
  db.prepare("UPDATE orders SET status = 'refunded', fulfillment = 'cancelled' WHERE id = ?").run(id);
  db.prepare("UPDATE payments SET status = 'refunded', refund_status = 'refunded' WHERE order_id = ?").run(id);
  releaseStock(order);
  recordAdminEvent(id, "refund", "Marked refunded. Complete the refund in the payment provider.");
  res.json(getOrder({ id }));
});

adminRouter.post("/orders/:id/resend-email", async (req, res) => {
  const id = idParam(req.params.id);
  const order = getOrder({ id });
  if (!order) throw notFound("Order not found.");
  const sent = await resendOrderEmail(id);
  if (!sent) throw new HttpError(502, "The email provider did not accept the message.");
  recordAdminEvent(id, "resend_email", order.customer.email);
  res.json({ ok: true });
});

// ---------- Products ----------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string, exceptId?: number): string {
  const root = base || "product";
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const row = db.prepare("SELECT id FROM products WHERE slug = ?").get(candidate) as { id: number } | undefined;
    if (!row || row.id === exceptId) return candidate;
  }
}

function readProduct(body: Record<string, unknown>, existing?: StoreProduct) {
  const name = str(body.name ?? existing?.name, "Name", { max: 120 });
  const requestedSlug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : existing?.slug ?? slugify(name);
  const skuSource = typeof body.sku === "string" ? body.sku : existing?.sku;
  return {
    name,
    slug: uniqueSlug(requestedSlug, existing?.id),
    sku: str(skuSource || requestedSlug, "SKU", { max: 80 }),
    description: str(body.description ?? existing?.description, "Description", { max: 5000, optional: true }),
    price: int(body.price ?? existing?.price, "Price (in paise)", { min: 100, max: 10_000_000 }),
    stock: int(body.stock ?? existing?.stock, "Stock", { min: 0, max: 1_000_000 }),
    active: typeof body.active === "boolean" ? body.active : existing?.active ?? true,
  };
}

adminRouter.get("/products", (_req, res) => {
  res.json(listProducts({ activeOnly: false }));
});

adminRouter.get("/products/:id", (req, res) => {
  const product = getProductById(idParam(req.params.id));
  if (!product) throw notFound("Product not found.");
  res.json(product);
});

adminRouter.post("/products", (req, res) => {
  const p = readProduct(req.body ?? {});
  const { lastInsertRowid } = db
    .prepare("INSERT INTO products (slug, sku, name, description, price, stock, active) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(p.slug, p.sku, p.name, p.description, p.price, p.stock, p.active ? 1 : 0);
  res.status(201).json(getProductById(Number(lastInsertRowid)));
});

adminRouter.patch("/products/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const existing = getProductById(id);
  if (!existing) throw notFound("Product not found.");
  const p = readProduct(req.body ?? {}, existing);

  // `images` may only reorder or remove existing images; new ones go through the upload route.
  let images = existing.images;
  if (req.body?.images !== undefined) {
    if (!Array.isArray(req.body.images) || req.body.images.some((url: unknown) => typeof url !== "string" || !existing.images.includes(url))) {
      throw badRequest("Images can only be reordered or removed here.");
    }
    images = req.body.images as string[];
  }

  db.prepare(
    "UPDATE products SET slug = ?, sku = ?, name = ?, description = ?, price = ?, stock = ?, active = ?, images = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(p.slug, p.sku, p.name, p.description, p.price, p.stock, p.active ? 1 : 0, JSON.stringify(images), id);

  await removeFiles(existing.images.filter((url) => !images.includes(url)));
  res.json(getProductById(id));
});

adminRouter.delete("/products/:id", async (req, res) => {
  const id = idParam(req.params.id);
  const existing = getProductById(id);
  if (!existing) throw notFound("Product not found.");
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  await removeFiles(existing.images);
  res.json({ ok: true });
});

// ---------- Image uploads ----------

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};
const MAX_IMAGES = 12;

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadsDir,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${IMAGE_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) cb(null, true);
    else cb(badRequest("Only JPG, PNG, WebP, AVIF or GIF images can be uploaded."));
  },
});

adminRouter.post("/products/:id/images", upload.array("images", MAX_IMAGES), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const id = idParam(req.params.id);
  const existing = getProductById(id);
  const urls = files.map((file) => `/uploads/${file.filename}`);

  if (!existing || existing.images.length + urls.length > MAX_IMAGES) {
    await removeFiles(urls);
    throw existing ? badRequest(`A product can have at most ${MAX_IMAGES} images.`) : notFound("Product not found.");
  }
  if (urls.length === 0) throw badRequest("Choose at least one image.");

  db.prepare("UPDATE products SET images = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify([...existing.images, ...urls]), id);
  res.status(201).json(getProductById(id));
});

adminRouter.get("/coupons", (_req, res) => {
  res.json(listCoupons());
});

adminRouter.post("/coupons", (req, res) => {
  res.status(201).json(createCoupon(req.body ?? {}));
});

adminRouter.patch("/coupons/:id", (req, res) => {
  if (typeof req.body?.active !== "boolean") throw badRequest("Say whether the code is active.");
  res.json(setCouponActive(idParam(req.params.id), req.body.active));
});

async function removeFiles(urls: string[]): Promise<void> {
  await Promise.all(
    urls
      .filter((url) => url.startsWith("/uploads/"))
      .map((url) => unlink(path.join(config.uploadsDir, path.basename(url))).catch(() => undefined)),
  );
}
