import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { AdminOrder, CustomerDetails, Fulfillment, OrderItem, OrderSummary, PaymentMethod, PaymentStatus, ShipmentInfo, StoreProduct, TrackingUpdate } from "../shared/store";
import { canClearUnpaidCheckout, defaultReminder } from "../shared/reminder.ts";
import { formatOrderCode, RELEASE_STOCK_SQL, RESERVE_STOCK_SQL } from "./commerce";
import { config } from "./config";

export const db = new DatabaseSync(path.join(config.dataDir, "store.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT    NOT NULL UNIQUE,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    price       INTEGER NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    images      TEXT    NOT NULL DEFAULT '[]',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id           TEXT    NOT NULL UNIQUE,
    razorpay_order_id   TEXT    UNIQUE,
    razorpay_payment_id TEXT,
    status              TEXT    NOT NULL DEFAULT 'pending',
    fulfillment         TEXT    NOT NULL DEFAULT 'unfulfilled',
    amount              INTEGER NOT NULL,
    currency            TEXT    NOT NULL DEFAULT 'INR',
    customer_name       TEXT    NOT NULL,
    customer_email      TEXT    NOT NULL,
    customer_phone      TEXT    NOT NULL,
    address_line1       TEXT    NOT NULL,
    address_line2       TEXT    NOT NULL DEFAULT '',
    city                TEXT    NOT NULL,
    state               TEXT    NOT NULL,
    postal_code         TEXT    NOT NULL,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    paid_at             TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    name       TEXT    NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS orders_status ON orders(status);

  CREATE TABLE IF NOT EXISTS waitlist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS customers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT    NOT NULL UNIQUE,
    name            TEXT    NOT NULL,
    phone           TEXT    NOT NULL DEFAULT '',
    password_hash   TEXT    NOT NULL,
    session_version INTEGER NOT NULL DEFAULT 1,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS addresses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    phone       TEXT    NOT NULL,
    line1       TEXT    NOT NULL,
    line2       TEXT    NOT NULL DEFAULT '',
    city        TEXT    NOT NULL,
    state       TEXT    NOT NULL,
    postal_code TEXT    NOT NULL,
    is_default  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS addresses_customer ON addresses(customer_id);

  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash  TEXT    PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    expires_at  INTEGER NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0
  );
`);

// Migration: orders placed while signed in are linked to the customer.
const orderColumns = (db.prepare("PRAGMA table_info(orders)").all() as unknown as { name: string }[]).map((c) => c.name);
if (!orderColumns.includes("customer_id")) {
  db.exec("ALTER TABLE orders ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL");
}
db.exec("CREATE INDEX IF NOT EXISTS orders_customer ON orders(customer_id)");

function hasColumn(table: string, name: string): boolean {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as unknown as { name: string }[]).some((column) => column.name === name);
}

function addColumn(table: string, name: string, definition: string) {
  if (!hasColumn(table, name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
}

addColumn("products", "sku", "TEXT NOT NULL DEFAULT ''");
addColumn("orders", "payment_method", "TEXT NOT NULL DEFAULT 'razorpay'");
addColumn("orders", "subtotal", "INTEGER NOT NULL DEFAULT 0");
addColumn("orders", "shipping_paise", "INTEGER NOT NULL DEFAULT 0");
addColumn("orders", "notes", "TEXT NOT NULL DEFAULT ''");
addColumn("orders", "upi_reference", "TEXT NOT NULL DEFAULT ''");
addColumn("orders", "confirmation_sent", "INTEGER NOT NULL DEFAULT 0");
addColumn("orders", "confirmation_letter", "TEXT NOT NULL DEFAULT ''");
addColumn("orders", "stock_held", "INTEGER NOT NULL DEFAULT 0");
addColumn("orders", "idempotency_key", "TEXT");
addColumn("orders", "coupon_code", "TEXT NOT NULL DEFAULT ''");
addColumn("orders", "discount_paise", "INTEGER NOT NULL DEFAULT 0");
db.exec(`
  UPDATE products SET sku = slug WHERE sku = '';
  UPDATE orders SET subtotal = amount WHERE subtotal = 0 AND amount > 0;
  CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

  CREATE TABLE IF NOT EXISTS payments (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider            TEXT    NOT NULL,
    provider_order_id   TEXT,
    provider_payment_id TEXT,
    amount              INTEGER NOT NULL,
    currency            TEXT    NOT NULL DEFAULT 'INR',
    status              TEXT    NOT NULL,
    refund_status       TEXT    NOT NULL DEFAULT 'none',
    created_at          TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS payments_order ON payments(order_id);

  CREATE TABLE IF NOT EXISTS order_updates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    label      TEXT    NOT NULL,
    note       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS order_updates_order ON order_updates(order_id);

  CREATE TABLE IF NOT EXISTS shipments (
    order_id      INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    courier       TEXT    NOT NULL DEFAULT '',
    tracking_ref  TEXT    NOT NULL DEFAULT '',
    tracking_url  TEXT    NOT NULL DEFAULT '',
    dispatched_at TEXT,
    delivered_at  TEXT,
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT    NOT NULL UNIQUE,
    kind       TEXT    NOT NULL,
    value      INTEGER NOT NULL,
    max_uses   INTEGER NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admin_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    action     TEXT    NOT NULL,
    detail     TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shop_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

addColumn("shipments", "location", "TEXT NOT NULL DEFAULT ''");

/** Runs `fn` inside a transaction, rolling back if it throws. */
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// ---------- Products ----------

interface ProductRow {
  id: number;
  slug: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string;
  active: number;
  created_at: string;
  updated_at: string;
}

function toProduct(row: ProductRow): StoreProduct {
  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    description: row.description,
    price: row.price,
    stock: row.stock,
    images: JSON.parse(row.images) as string[],
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listProducts({ activeOnly }: { activeOnly: boolean }): StoreProduct[] {
  const sql = `SELECT * FROM products ${activeOnly ? "WHERE active = 1" : ""} ORDER BY id`;
  return (db.prepare(sql).all() as unknown as ProductRow[]).map(toProduct);
}

export function getProductById(id: number): StoreProduct | undefined {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as unknown as ProductRow | undefined;
  return row && toProduct(row);
}

export function getProductBySlug(slug: string): StoreProduct | undefined {
  const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as unknown as ProductRow | undefined;
  return row && toProduct(row);
}

// ---------- Orders ----------

interface OrderRow {
  id: number;
  public_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  customer_id: number | null;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  subtotal: number;
  shipping_paise: number;
  discount_paise: number;
  coupon_code: string;
  amount: number;
  currency: string;
  notes: string;
  upi_reference: string;
  stock_held: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  created_at: string;
  paid_at: string | null;
}

interface ShipmentRow {
  order_id: number;
  courier: string;
  tracking_ref: string;
  tracking_url: string;
  location: string;
  dispatched_at: string | null;
  delivered_at: string | null;
}

interface UpdateRow {
  order_id: number;
  label: string;
  note: string;
  created_at: string;
}

interface OrderItemRow {
  order_id: number;
  product_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
}

function itemsFor(orderIds: number[]): Map<number, OrderItem[]> {
  const byOrder = new Map<number, OrderItem[]>();
  if (orderIds.length === 0) return byOrder;
  const placeholders = orderIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`)
    .all(...orderIds) as unknown as OrderItemRow[];
  for (const row of rows) {
    const list = byOrder.get(row.order_id) ?? [];
    list.push({ productId: row.product_id, name: row.name, unitPrice: row.unit_price, quantity: row.quantity });
    byOrder.set(row.order_id, list);
  }
  return byOrder;
}

function shipmentsFor(orderIds: number[]): Map<number, ShipmentInfo> {
  const byOrder = new Map<number, ShipmentInfo>();
  if (orderIds.length === 0) return byOrder;
  const placeholders = orderIds.map(() => "?").join(",");
  const rows = db.prepare(`SELECT * FROM shipments WHERE order_id IN (${placeholders})`).all(...orderIds) as unknown as ShipmentRow[];
  for (const row of rows) {
    byOrder.set(row.order_id, {
      courier: row.courier,
      trackingRef: row.tracking_ref,
      trackingUrl: row.tracking_url,
      location: row.location ?? "",
      dispatchedAt: row.dispatched_at,
      deliveredAt: row.delivered_at,
    });
  }
  return byOrder;
}

function updatesFor(orderIds: number[]): Map<number, TrackingUpdate[]> {
  const byOrder = new Map<number, TrackingUpdate[]>();
  if (orderIds.length === 0) return byOrder;
  const placeholders = orderIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT order_id, label, note, created_at FROM order_updates WHERE order_id IN (${placeholders}) ORDER BY id`)
    .all(...orderIds) as unknown as UpdateRow[];
  for (const row of rows) {
    const list = byOrder.get(row.order_id) ?? [];
    list.push({ label: row.label, note: row.note, at: row.created_at });
    byOrder.set(row.order_id, list);
  }
  return byOrder;
}

export function addOrderUpdate(orderId: number, label: string, note: string): void {
  db.prepare("INSERT INTO order_updates (order_id, label, note) VALUES (?, ?, ?)").run(orderId, label, note.trim());
}

function toOrders(rows: OrderRow[]): AdminOrder[] {
  const items = itemsFor(rows.map((r) => r.id));
  const shipments = shipmentsFor(rows.map((r) => r.id));
  const updates = updatesFor(rows.map((r) => r.id));
  return rows.map((row) => ({
    id: row.id,
    publicId: row.public_id,
    code: formatOrderCode(row.id),
    status: row.status,
    fulfillment: row.fulfillment,
    paymentMethod: row.payment_method,
    subtotal: row.subtotal,
    shippingPaise: row.shipping_paise,
    discountPaise: row.discount_paise ?? 0,
    couponCode: row.coupon_code ?? "",
    amount: row.amount,
    currency: row.currency,
    notes: row.notes,
    upiReference: row.upi_reference,
    stockHeld: row.stock_held === 1,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    customerId: row.customer_id,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
    },
    items: items.get(row.id) ?? [],
    shipment: shipments.get(row.id) ?? null,
    updates: updates.get(row.id) ?? [],
    createdAt: row.created_at,
    paidAt: row.paid_at,
  }));
}

export function listOrders({ status, customerId, limit = 500 }: { status?: PaymentStatus; customerId?: number; limit?: number } = {}): AdminOrder[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (customerId !== undefined) {
    where.push("customer_id = ?");
    params.push(customerId);
  }
  const sql = `SELECT * FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT ?`;
  return toOrders(db.prepare(sql).all(...params, limit) as unknown as OrderRow[]);
}

/** The customer-facing view of an order. */
export function toOrderSummary(order: AdminOrder): OrderSummary {
  return {
    id: order.publicId,
    number: order.id,
    code: order.code,
    status: order.status,
    fulfillment: order.fulfillment,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shippingPaise: order.shippingPaise,
    discountPaise: order.discountPaise,
    couponCode: order.couponCode,
    amount: order.amount,
    currency: order.currency,
    customerName: order.customer.name,
    email: order.customer.email,
    items: order.items,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shipment: order.shipment ? { courier: order.shipment.courier, trackingUrl: order.shipment.trackingUrl, location: order.shipment.location } : null,
    updates: order.updates,
  };
}

export function toTrackedOrder(order: AdminOrder) {
  const summary = toOrderSummary(order);
  return {
    code: summary.code,
    createdAt: summary.createdAt,
    items: summary.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
    subtotal: summary.subtotal,
    shippingPaise: summary.shippingPaise,
    discountPaise: summary.discountPaise,
    couponCode: summary.couponCode,
    amount: summary.amount,
    currency: summary.currency,
    paymentMethod: summary.paymentMethod,
    status: summary.status,
    fulfillment: summary.fulfillment,
    shipment: summary.shipment,
    updates: summary.updates,
  };
}

export function getOrder(where: { id: number } | { publicId: string } | { razorpayOrderId: string }): AdminOrder | undefined {
  const [column, value] =
    "id" in where ? ["id", where.id] : "publicId" in where ? ["public_id", where.publicId] : ["razorpay_order_id", where.razorpayOrderId];
  const row = db.prepare(`SELECT * FROM orders WHERE ${column} = ?`).get(value) as unknown as OrderRow | undefined;
  return row && toOrders([row])[0];
}

export interface NewOrder {
  publicId: string;
  customer: CustomerDetails;
  items: OrderItem[];
  customerId: number | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingPaise: number;
  discountPaise: number;
  couponCode: string;
  notes: string;
  idempotencyKey: string | null;
}

/** Returns an existing order when the same idempotency key is sent again. */
export function findIdempotentOrder(key: string): AdminOrder | undefined {
  const row = db.prepare("SELECT id FROM orders WHERE idempotency_key = ?").get(key) as { id: number } | undefined;
  return row ? getOrder({ id: row.id }) : undefined;
}

export function insertOrder(input: NewOrder): number {
  const discount = Math.max(0, input.discountPaise);
  const amount = input.subtotal - discount + input.shippingPaise;
  return transaction(() => {
    if (input.couponCode) {
      const reserved = db.prepare("UPDATE coupons SET used = used + 1 WHERE code = ? AND active = 1 AND used < max_uses").run(input.couponCode);
      if (reserved.changes !== 1) {
        const row = db.prepare("SELECT active FROM coupons WHERE code = ?").get(input.couponCode) as { active: number } | undefined;
        if (!row) throw new Error("That code isn't valid.");
        if (row.active !== 1) throw new Error("That code is no longer active.");
        throw new Error("This code has been used up.");
      }
    }
    const reserve = db.prepare(RESERVE_STOCK_SQL);
    for (const item of input.items) {
      if (item.productId === null) throw new Error("Every new line needs a product.");
      const result = reserve.run(item.quantity, item.productId, item.quantity);
      if (result.changes !== 1) {
        const product = getProductById(item.productId);
        const name = product?.name ?? "An item";
        throw new Error(product && product.stock > 0 ? `Only ${product.stock} of ${name} left in stock.` : `${name} is coming soon.`);
      }
    }
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO orders (public_id, customer_id, payment_method, subtotal, shipping_paise, discount_paise, coupon_code, amount, notes,
           idempotency_key, stock_held, customer_name, customer_email, customer_phone,
           address_line1, address_line2, city, state, postal_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.publicId,
        input.customerId,
        input.paymentMethod,
        input.subtotal,
        input.shippingPaise,
        discount,
        input.couponCode,
        amount,
        input.notes,
        input.idempotencyKey,
        input.customer.name,
        input.customer.email,
        input.customer.phone,
        input.customer.line1,
        input.customer.line2,
        input.customer.city,
        input.customer.state,
        input.customer.postalCode,
      );
    const orderId = Number(lastInsertRowid);
    const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)");
    for (const item of input.items) insertItem.run(orderId, item.productId, item.name, item.unitPrice, item.quantity);
    db.prepare("INSERT INTO payments (order_id, provider, amount, currency, status) VALUES (?, ?, ?, 'INR', 'pending')").run(orderId, input.paymentMethod, amount);
    return orderId;
  });
}

export function releaseStock(order: AdminOrder): void {
  if (!order.stockHeld) return;
  const release = db.prepare(RELEASE_STOCK_SQL);
  for (const item of order.items) if (item.productId !== null) release.run(item.quantity, item.productId);
  if (order.couponCode) db.prepare("UPDATE coupons SET used = MAX(used - 1, 0) WHERE code = ?").run(order.couponCode);
  db.prepare("UPDATE orders SET stock_held = 0 WHERE id = ?").run(order.id);
}

export function recordAdminEvent(orderId: number | null, action: string, detail = ""): void {
  db.prepare("INSERT INTO admin_events (order_id, action, detail) VALUES (?, ?, ?)").run(orderId, action, detail.slice(0, 500));
}

/** Claims one letter per kind. A webhook retry of the same letter does not send again; a later paid letter still can. */
export function claimConfirmationEmail(orderId: number, letter: string): boolean {
  const row = db.prepare("SELECT confirmation_letter FROM orders WHERE id = ?").get(orderId) as { confirmation_letter: string } | undefined;
  if (!row || row.confirmation_letter === letter) return false;
  db.prepare("UPDATE orders SET confirmation_sent = 1, confirmation_letter = ? WHERE id = ?").run(letter, orderId);
  return true;
}

/**
 * Marks an order paid and takes the items out of stock. Safe to call more than
 * once for the same order (the browser callback and the webhook both call it).
 */
export function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string, paidAmount?: number): AdminOrder | undefined {
  return transaction(() => {
    const order = getOrder({ razorpayOrderId });
    if (!order || order.status === "paid") return order;
    if (order.status === "refunded" || order.status === "failed") return order;
    if (paidAmount !== undefined && paidAmount !== order.amount) return order;
    db.prepare("UPDATE orders SET status = 'paid', razorpay_payment_id = ?, paid_at = datetime('now') WHERE id = ?").run(razorpayPaymentId, order.id);
    db.prepare(
      "UPDATE payments SET status = 'paid', provider_order_id = ?, provider_payment_id = ? WHERE order_id = ? AND status = 'pending'",
    ).run(razorpayOrderId, razorpayPaymentId, order.id);
    // Orders placed before stock was reserved at checkout still need stock taken here, once.
    if (!order.stockHeld) {
      const takeStock = db.prepare("UPDATE products SET stock = MAX(stock - ?, 0), updated_at = datetime('now') WHERE id = ?");
      for (const item of order.items) if (item.productId !== null) takeStock.run(item.quantity, item.productId);
      db.prepare("UPDATE orders SET stock_held = 1 WHERE id = ?").run(order.id);
    }
    return getOrder({ id: order.id });
  });
}

export function markOrderPaidById(orderId: number, reference: string): AdminOrder | undefined {
  return transaction(() => {
    const order = getOrder({ id: orderId });
    if (!order || order.status === "paid") return order;
    if (order.status !== "pending") return order;
    db.prepare("UPDATE orders SET status = 'paid', razorpay_payment_id = ?, paid_at = datetime('now') WHERE id = ?").run(reference, order.id);
    db.prepare("UPDATE payments SET status = 'paid', provider_payment_id = ? WHERE order_id = ? AND status = 'pending'").run(reference, order.id);
    return getOrder({ id: order.id });
  });
}

export function getReminderTemplate(): { subject: string; body: string } {
  const read = (key: string, fallback: string) => {
    const row = db.prepare("SELECT value FROM shop_settings WHERE key = ?").get(key) as { value: string } | undefined;
    return row?.value || fallback;
  };
  return {
    subject: read("payment_reminder_subject", defaultReminder.subject),
    body: read("payment_reminder_body", defaultReminder.body),
  };
}

export function saveReminderTemplate(subject: string, body: string): void {
  const save = db.prepare("INSERT INTO shop_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  save.run("payment_reminder_subject", subject);
  save.run("payment_reminder_body", body);
}

/** Releases stock and coupon use, then removes the order. Paid orders are left alone. */
export function deleteUnpaidCheckouts(ids: number[]): { deleted: number; skipped: number } {
  let deleted = 0;
  let skipped = 0;
  for (const id of ids) {
    const code = transaction(() => {
      const order = getOrder({ id });
      if (!order || !canClearUnpaidCheckout(order)) return "";
      releaseStock(order);
      const result = db
        .prepare(
          "DELETE FROM orders WHERE id = ? AND status = 'pending' AND payment_method = 'razorpay' AND (razorpay_payment_id IS NULL OR razorpay_payment_id = '')",
        )
        .run(id);
      return result.changes === 1 ? order.code : "";
    });
    if (code) {
      deleted += 1;
      recordAdminEvent(null, "delete_unpaid", code);
    } else skipped += 1;
  }
  return { deleted, skipped };
}

export function markOrderFailed(razorpayOrderId: string): void {
  transaction(() => {
    const order = getOrder({ razorpayOrderId });
    if (!order || order.status !== "pending") return;
    db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(order.id);
    db.prepare("UPDATE payments SET status = 'failed' WHERE order_id = ? AND status = 'pending'").run(order.id);
    releaseStock(order);
  });
}

// ---------- Seed ----------

const productCount = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
if (productCount === 0) {
  // Matches the slugs in src/data/products.ts so the coffee pages pick up price and stock.
  // Honest Truth and Bitter Truth start unavailable. Dark Truth is the one in stock.
  const seed = db.prepare("INSERT INTO products (slug, sku, name, description, price, stock) VALUES (?, ?, ?, ?, ?, ?)");
  seed.run("honest-truth", "honest-truth", "Honest Truth", "100% Arabica from Coorg. Medium plus roast — chocolate, caramel, mild nut.", 49900, 0);
  seed.run("dark-truth", "dark-truth", "Dark Truth", "100% Robusta. Bold, intense, powerful.", 44900, 25);
  seed.run("bitter-truth", "bitter-truth", "Bitter Truth", "70% Arabica / 30% Robusta. Balanced, bold, complex.", 47900, 0);
}
