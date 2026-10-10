import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import type { AdminOrder, CustomerDetails, Fulfillment, OrderItem, OrderSummary, PaymentStatus, StoreProduct } from "../shared/store";
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
  amount: number;
  currency: string;
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

function toOrders(rows: OrderRow[]): AdminOrder[] {
  const items = itemsFor(rows.map((r) => r.id));
  return rows.map((row) => ({
    id: row.id,
    publicId: row.public_id,
    status: row.status,
    fulfillment: row.fulfillment,
    amount: row.amount,
    currency: row.currency,
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
    status: order.status,
    fulfillment: order.fulfillment,
    amount: order.amount,
    currency: order.currency,
    customerName: order.customer.name,
    email: order.customer.email,
    items: order.items,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
  };
}

export function getOrder(where: { id: number } | { publicId: string } | { razorpayOrderId: string }): AdminOrder | undefined {
  const [column, value] =
    "id" in where ? ["id", where.id] : "publicId" in where ? ["public_id", where.publicId] : ["razorpay_order_id", where.razorpayOrderId];
  const row = db.prepare(`SELECT * FROM orders WHERE ${column} = ?`).get(value) as unknown as OrderRow | undefined;
  return row && toOrders([row])[0];
}

export function insertOrder(publicId: string, customer: CustomerDetails, items: OrderItem[], customerId: number | null): number {
  const amount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return transaction(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO orders (public_id, customer_id, amount, customer_name, customer_email, customer_phone,
           address_line1, address_line2, city, state, postal_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(publicId, customerId, amount, customer.name, customer.email, customer.phone, customer.line1, customer.line2, customer.city, customer.state, customer.postalCode);
    const orderId = Number(lastInsertRowid);
    const insertItem = db.prepare("INSERT INTO order_items (order_id, product_id, name, unit_price, quantity) VALUES (?, ?, ?, ?, ?)");
    for (const item of items) insertItem.run(orderId, item.productId, item.name, item.unitPrice, item.quantity);
    return orderId;
  });
}

/**
 * Marks an order paid and takes the items out of stock. Safe to call more than
 * once for the same order (the browser callback and the webhook both call it).
 */
export function markOrderPaid(razorpayOrderId: string, razorpayPaymentId: string): AdminOrder | undefined {
  return transaction(() => {
    const order = getOrder({ razorpayOrderId });
    if (!order || order.status === "paid") return order;
    db.prepare("UPDATE orders SET status = 'paid', razorpay_payment_id = ?, paid_at = datetime('now') WHERE id = ?").run(razorpayPaymentId, order.id);
    const takeStock = db.prepare("UPDATE products SET stock = MAX(stock - ?, 0), updated_at = datetime('now') WHERE id = ?");
    for (const item of order.items) if (item.productId !== null) takeStock.run(item.quantity, item.productId);
    return getOrder({ id: order.id });
  });
}

export function markOrderFailed(razorpayOrderId: string): void {
  db.prepare("UPDATE orders SET status = 'failed' WHERE razorpay_order_id = ? AND status = 'pending'").run(razorpayOrderId);
}

// ---------- Seed ----------

const productCount = (db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }).n;
if (productCount === 0) {
  // Matches the slugs in src/data/products.ts so the coffee pages pick up price and stock.
  // Prices and stock are placeholders — change them in the admin.
  const seed = db.prepare("INSERT INTO products (slug, name, description, price, stock) VALUES (?, ?, ?, ?, ?)");
  seed.run("honest-truth", "Honest Truth", "100% Arabica. Smooth, aromatic, refined.", 49900, 25);
  seed.run("dark-truth", "Dark Truth", "100% Robusta. Bold, intense, powerful.", 44900, 25);
  seed.run("bitter-truth", "Bitter Truth", "70% Arabica / 30% Robusta. Balanced, bold, complex.", 47900, 25);
}
