import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import { FULFILLMENT_STATES, type AdminStats, type Fulfillment, type PaymentStatus, type StoreProduct } from "../../shared/store";
import { checkCredentials, endSession, loginRateLimit, requireAdmin, resetLoginAttempts, sessionEmail, startSession } from "../auth";
import { config } from "../config";
import { db, getOrder, getProductById, listOrders, listProducts } from "../db";
import { badRequest, HttpError, idParam, int, notFound, str } from "../http";

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

// ---------- Dashboard ----------

const LOW_STOCK = 5;

adminRouter.get("/stats", (_req, res) => {
  const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  const stats: AdminStats = {
    revenue: count("SELECT COALESCE(SUM(amount), 0) AS n FROM orders WHERE status = 'paid' AND fulfillment != 'cancelled'"),
    paidOrders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid'"),
    pendingOrders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'"),
    unfulfilledOrders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'paid' AND fulfillment = 'unfulfilled'"),
    products: count("SELECT COUNT(*) AS n FROM products"),
    lowStock: db
      .prepare("SELECT id, name, stock FROM products WHERE active = 1 AND stock <= ? ORDER BY stock, name")
      .all(LOW_STOCK) as unknown as AdminStats["lowStock"],
    recentOrders: listOrders({ limit: 8 }),
  };
  res.json(stats);
});

// ---------- Orders ----------

const PAYMENT_STATES: PaymentStatus[] = ["pending", "paid", "failed"];

adminRouter.get("/orders", (req, res) => {
  const status = req.query.status as PaymentStatus | undefined;
  if (status && !PAYMENT_STATES.includes(status)) throw badRequest("Unknown status.");
  res.json(listOrders({ status }));
});

adminRouter.get("/orders/:id", (req, res) => {
  const order = getOrder({ id: idParam(req.params.id) });
  if (!order) throw notFound("Order not found.");
  res.json(order);
});

adminRouter.patch("/orders/:id", (req, res) => {
  const id = idParam(req.params.id);
  const fulfillment = req.body?.fulfillment as Fulfillment;
  if (!FULFILLMENT_STATES.includes(fulfillment)) throw badRequest("Unknown fulfilment status.");
  const { changes } = db.prepare("UPDATE orders SET fulfillment = ? WHERE id = ?").run(fulfillment, id);
  if (!changes) throw notFound("Order not found.");
  res.json(getOrder({ id }));
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
  return {
    name,
    slug: uniqueSlug(requestedSlug, existing?.id),
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
    .prepare("INSERT INTO products (slug, name, description, price, stock, active) VALUES (?, ?, ?, ?, ?, ?)")
    .run(p.slug, p.name, p.description, p.price, p.stock, p.active ? 1 : 0);
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
    "UPDATE products SET slug = ?, name = ?, description = ?, price = ?, stock = ?, active = ?, images = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(p.slug, p.name, p.description, p.price, p.stock, p.active ? 1 : 0, JSON.stringify(images), id);

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

async function removeFiles(urls: string[]): Promise<void> {
  await Promise.all(
    urls
      .filter((url) => url.startsWith("/uploads/"))
      .map((url) => unlink(path.join(config.uploadsDir, path.basename(url))).catch(() => undefined)),
  );
}
