import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

const dataDir = mkdtempSync(path.join(tmpdir(), "bt-store-"));
process.env.DATA_DIR = dataDir;
process.env.UPI_VPA = "store@upi";
process.env.UPI_PAYEE_NAME = "Bitter Truth Coffee";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.RESEND_API_KEY = "re_test_not_real";
process.env.EMAIL_FROM = "orders@example.com";
process.env.COD_ENABLED = "true";
process.env.SHIPPING_PAISE = "0";
process.env.SITE_VERSION = "v2";
process.env.ADMIN_EMAIL = "owner@example.com";
process.env.ADMIN_NOTIFY_EMAIL = "";

const realFetch = globalThis.fetch;
let emailStatus = 200;
const emails: { to: string; subject: string; text: string }[] = [];
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url.includes("api.resend.com")) {
    const body = JSON.parse(String(init?.body ?? "{}")) as { to: string; subject: string; text: string };
    emails.push(body);
    return new Response(emailStatus === 200 ? "{}" : "no", { status: emailStatus });
  }
  if (url.includes("api.razorpay.com")) return new Response("refused", { status: 500 });
  return realFetch(input, init);
};

const express = (await import("express")).default;
const cookieParser = (await import("cookie-parser")).default;
const jwt = (await import("jsonwebtoken")).default;
const { storeRouter, razorpayWebhook } = await import("./routes/store.ts");
const { adminRouter } = await import("./routes/admin.ts");
const { errorHandler } = await import("./http.ts");
const { config } = await import("./config.ts");
const { db, getOrder, getProductBySlug, insertOrder, markOrderFailed } = await import("./db.ts");
db.prepare("UPDATE products SET stock = 25, active = 1 WHERE slug IN ('honest-truth', 'bitter-truth', 'dark-truth')").run();
const { verifyPaymentSignature } = await import("./razorpay.ts");
const { notifyOrderOnce } = await import("./notify.ts");

const app = express();
app.set("trust proxy", 1);
app.post("/api/webhooks/razorpay", ...razorpayWebhook);
app.use(express.json());
app.use(cookieParser());
app.use("/api/admin", adminRouter);
app.use("/api", storeRouter);
app.use(errorHandler);

const server: Server = createServer(app);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (!address || typeof address === "string") throw new Error("Test server did not bind.");
const base = `http://127.0.0.1:${address.port}`;

after(() => {
  server.close();
  db.close();
  rmSync(dataDir, { recursive: true, force: true });
});

const customer = {
  name: "Asha Rao",
  email: "asha@example.com",
  phone: "9810012345",
  line1: "1 Road",
  line2: "",
  city: "New Delhi",
  state: "Delhi",
  postalCode: "110001",
};

function adminCookie(): string {
  const token = jwt.sign({ sub: config.admin.email, role: "admin" }, config.jwtSecret, { expiresIn: "1h" });
  return `ht_admin=${token}`;
}

function stockOf(slug: string): number {
  return getProductBySlug(slug)?.stock ?? -1;
}

function productId(slug: string): number {
  const product = getProductBySlug(slug);
  if (!product) throw new Error(`Missing ${slug}`);
  return product.id;
}

async function request(urlPath: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(base + urlPath, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? (JSON.parse(text) as Record<string, unknown>) : {} };
}

async function checkout(slug: string, extra: Record<string, unknown> = {}) {
  return request("/api/checkout/order", {
    items: [{ productId: productId(slug), quantity: 1, unitPrice: 100 }],
    customer,
    paymentMethod: "cod",
    idempotencyKey: crypto.randomUUID(),
    ...extra,
  });
}

function orderRow(publicId: string): { id: number; status: string; amount: number; confirmation_letter: string } {
  return db.prepare("SELECT id, status, amount, confirmation_letter FROM orders WHERE public_id = ?").get(publicId) as {
    id: number;
    status: string;
    amount: number;
    confirmation_letter: string;
  };
}

describe("checkout", () => {
  it("prices from the database and ignores a tampered unit price", async () => {
    const before = stockOf("honest-truth");
    const res = await checkout("honest-truth");
    assert.equal(res.status, 201);
    assert.equal(res.body.amount, 49900);
    assert.equal(res.body.subtotal, 49900);
    assert.equal(stockOf("honest-truth"), before - 1);
    const row = orderRow(String(res.body.orderId));
    const item = db.prepare("SELECT unit_price FROM order_items WHERE order_id = ?").get(row.id) as { unit_price: number };
    assert.equal(item.unit_price, 49900);
  });

  it("accepts a PIN code anywhere in India", async () => {
    const before = stockOf("dark-truth");
    const ok = await checkout("dark-truth", {
      customer: { ...customer, city: "Bengaluru", state: "Karnataka", postalCode: "560001" },
    });
    assert.equal(ok.status, 201);
    assert.equal(stockOf("dark-truth"), before - 1);
  });

  it("rejects an inactive product and an out-of-stock product", async () => {
    db.prepare("UPDATE products SET active = 0 WHERE slug = 'dark-truth'").run();
    const inactive = await checkout("dark-truth");
    assert.equal(inactive.status, 400);
    db.prepare("UPDATE products SET active = 1, stock = 0 WHERE slug = 'dark-truth'").run();
    const soldOut = await checkout("dark-truth");
    assert.equal(soldOut.status, 400);
    db.prepare("UPDATE products SET stock = 25 WHERE slug = 'dark-truth'").run();
  });

  it("lets only one of two overlapping checkouts take the last unit", async () => {
    db.prepare("UPDATE products SET stock = 1, active = 1 WHERE slug = 'dark-truth'").run();
    const [a, b] = await Promise.all([checkout("dark-truth"), checkout("dark-truth")]);
    const statuses = [a.status, b.status].sort();
    assert.deepEqual(statuses, [201, 400]);
    assert.equal(stockOf("dark-truth"), 0);
    db.prepare("UPDATE products SET stock = 25 WHERE slug = 'dark-truth'").run();
  });

  it("reuses the same order when checkout is submitted twice", async () => {
    const key = crypto.randomUUID();
    const before = stockOf("bitter-truth");
    const first = await checkout("bitter-truth", { idempotencyKey: key });
    const second = await checkout("bitter-truth", { idempotencyKey: key });
    assert.equal(first.status, 201);
    assert.equal(second.status, 201);
    assert.equal(second.body.orderId, first.body.orderId);
    assert.equal(stockOf("bitter-truth"), before - 1);
  });

  it("does not mark a UPI order paid from a customer reference", async () => {
    const res = await checkout("honest-truth", { paymentMethod: "upi" });
    assert.equal(res.status, 201);
    assert.equal(res.body.paymentMethod, "upi");
    assert.match(String(res.body.upi && (res.body.upi as { intent: string }).intent), /am=499\.00/);
    const saved = await request(`/api/orders/${res.body.orderId}/upi-reference`, { reference: "UTR123456" });
    assert.equal(saved.status, 200);
    assert.equal(orderRow(String(res.body.orderId)).status, "pending");
    const letter = emails.filter((mail) => /not yet verified/.test(mail.subject)).at(-1);
    assert.match(letter?.subject ?? "", /not yet verified/);
    assert.match(letter?.text ?? "", /will not ship/);
  });

  it("releases stock when the payment provider refuses the order", async () => {
    const before = stockOf("honest-truth");
    const res = await checkout("honest-truth", { paymentMethod: "razorpay" });
    assert.equal(res.status, 500);
    assert.equal(stockOf("honest-truth"), before);
  });
});

describe("payments", () => {
  it("rejects an invalid payment signature and accepts a valid one", () => {
    const orderId = "order_test_sig";
    const paymentId = "pay_test_sig";
    const good = createHmac("sha256", config.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest("hex");
    assert.equal(verifyPaymentSignature(orderId, paymentId, good), true);
    const flipped = good.slice(0, -1) + (good.endsWith("a") ? "b" : "a");
    assert.equal(verifyPaymentSignature(orderId, paymentId, flipped), false);
  });

  it("ignores a bad webhook signature, a wrong amount, and a duplicate event", async () => {
    const created = await checkout("bitter-truth", { paymentMethod: "cod" });
    const row = orderRow(String(created.body.orderId));
    db.prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?").run("order_wh_1", row.id);

    const paid = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_wh_1", order_id: "order_wh_1", amount: row.amount, currency: "INR" } } },
    });
    const wrongAmount = paid.replace(`"amount":${row.amount}`, '"amount":100');
    const sign = (body: string) => createHmac("sha256", "test-webhook-secret").update(body).digest("hex");

    const bad = await fetch(base + "/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": "deadbeef" },
      body: paid,
    });
    assert.equal(bad.status, 400);
    assert.equal(orderRow(String(created.body.orderId)).status, "pending");

    const mismatch = await fetch(base + "/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": sign(wrongAmount) },
      body: wrongAmount,
    });
    assert.equal(mismatch.status, 200);
    assert.equal(orderRow(String(created.body.orderId)).status, "pending");

    const beforeEmails = emails.length;
    const first = await fetch(base + "/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": sign(paid) },
      body: paid,
    });
    const second = await fetch(base + "/api/webhooks/razorpay", {
      method: "POST",
      headers: { "content-type": "application/json", "x-razorpay-signature": sign(paid) },
      body: paid,
    });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(orderRow(String(created.body.orderId)).status, "paid");
    const paidLetters = emails.slice(beforeEmails).filter((mail) => mail.subject.includes("payment received"));
    assert.equal(paidLetters.length, 1);
  });
});

describe("tracking and admin", () => {
  it("looks an order up by its number and the phone on the order, and hides private fields", async () => {
    const created = await checkout("honest-truth", { paymentMethod: "cod" });
    const code = String(created.body.orderCode);
    const missing = await request("/api/track", { orderCode: "BT-9999", phone: "9810012345" });
    assert.equal(missing.status, 404);

    const wrongPhone = await request("/api/track", { orderCode: code, phone: "9000000000" });
    assert.equal(wrongPhone.status, 404);
    assert.equal(wrongPhone.body.error, "We couldn't find an order with that number and phone.");

    const found = await request("/api/track", { orderCode: code, phone: "+91 98100 12345" });
    assert.equal(found.status, 200);
    assert.equal(found.body.code, code);
    assert.equal("email" in found.body, false);
    assert.equal("notes" in found.body, false);
    assert.equal("razorpayPaymentId" in found.body, false);
  });

  it("refuses anonymous admin access, verifies UPI by hand, and blocks illegal fulfilment and refunds", async () => {
    const anonymous = await fetch(base + "/api/admin/orders");
    assert.equal(anonymous.status, 401);
    const badLogin = await request("/api/admin/login", { email: "nope@example.com", password: "not-the-password" });
    assert.equal(badLogin.status, 401);

    const created = await checkout("dark-truth", { paymentMethod: "upi" });
    const row = orderRow(String(created.body.orderId));
    const cookie = { cookie: adminCookie() };

    const manualGateway = await request(`/api/admin/orders/${row.id}/verify-payment`, {}, cookie);
    db.prepare("UPDATE orders SET payment_method = 'razorpay' WHERE id = ?").run(row.id);
    const refused = await request(`/api/admin/orders/${row.id}/verify-payment`, {}, cookie);
    assert.equal(refused.status, 400);
    db.prepare("UPDATE orders SET payment_method = 'upi' WHERE id = ?").run(row.id);

    const verified = await request(`/api/admin/orders/${row.id}/verify-payment`, {}, cookie);
    assert.equal(verified.status, 200);
    assert.equal((verified.body as { status: string }).status, "paid");
    assert.equal(manualGateway.status, 200);

    const patch = async (body: unknown) => {
      const res = await fetch(base + `/api/admin/orders/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", cookie: adminCookie() },
        body: JSON.stringify(body),
      });
      return res.status;
    };
    assert.equal(await patch({ fulfillment: "delivered" }), 400);
    assert.equal(await patch({ fulfillment: "shipped" }), 200);
    const refundAfterShip = await request(`/api/admin/orders/${row.id}/refund`, {}, cookie);
    assert.equal(refundAfterShip.status, 400);

    const cancelTarget = await checkout("dark-truth", { paymentMethod: "cod" });
    const cancelRow = orderRow(String(cancelTarget.body.orderId));
    const before = stockOf("dark-truth");
    const cancelled = await fetch(base + `/api/admin/orders/${cancelRow.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: adminCookie() },
      body: JSON.stringify({ fulfillment: "cancelled" }),
    });
    assert.equal(cancelled.status, 200);
    assert.equal(stockOf("dark-truth"), before + 1);
  });

  it("sends the confirmation again after the provider failed, and only once for the same letter", async () => {
    emailStatus = 500;
    const created = await checkout("bitter-truth", { paymentMethod: "cod" });
    const row = orderRow(String(created.body.orderId));
    assert.equal(row.confirmation_letter, "");
    emailStatus = 200;
    const before = emails.length;
    await notifyOrderOnce(row.id);
    const afterFirst = emails.length;
    await notifyOrderOnce(row.id);
    assert.equal(emails.length, afterFirst);
    const sent = emails.slice(before);
    const customer = sent.filter((mail) => !mail.subject.startsWith("New order"));
    assert.equal(customer.length, 1);
    assert.ok(sent.some((mail) => mail.subject.startsWith("New order")));
    assert.match(customer[0].text, /cash on delivery/);
    assert.match(customer[0].text, /phone number from checkout/);
  });

  it("reserves one coupon use and gives it back when the order fails", async () => {
    const cookie = { cookie: adminCookie() };
    const created = await request("/api/admin/coupons", { code: "FLAT79", kind: "flat", value: 7900, maxUses: 1 }, cookie);
    assert.equal(created.status, 201);

    const preview = await request("/api/checkout/coupon", {
      code: "flat79",
      items: [{ productId: productId("honest-truth"), quantity: 1 }],
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.total, 49900 - 7900);
    assert.equal((db.prepare("SELECT used FROM coupons WHERE code = 'FLAT79'").get() as { used: number }).used, 0);

    const before = stockOf("honest-truth");
    const order = await checkout("honest-truth", { couponCode: "flat79" });
    assert.equal(order.status, 201);
    assert.equal(order.body.amount, 42000);
    assert.equal(order.body.discountPaise, 7900);
    assert.equal(order.body.couponCode, "FLAT79");
    assert.equal(stockOf("honest-truth"), before - 1);
    const used = () => (db.prepare("SELECT used FROM coupons WHERE code = 'FLAT79'").get() as { used: number }).used;
    assert.equal(used(), 1);
    const letter = emails.find((mail) => mail.text.includes("Discount (FLAT79)") && !mail.subject.startsWith("New order"));
    assert.ok(letter);

    const blocked = await checkout("honest-truth", { couponCode: "FLAT79" });
    assert.equal(blocked.status, 400);
    assert.match(String(blocked.body.error), /used up/);
    assert.equal(stockOf("honest-truth"), before - 1);

    const row = orderRow(String(order.body.orderId));
    db.prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?").run("order_coupon_fail", row.id);
    markOrderFailed("order_coupon_fail");
    assert.equal(used(), 0);
    assert.equal(stockOf("honest-truth"), before);

    const again = await checkout("honest-truth", { couponCode: "FLAT79" });
    assert.equal(again.status, 201);
    assert.equal(used(), 1);
    const againRow = orderRow(String(again.body.orderId));
    const cancelled = await fetch(base + `/api/admin/orders/${againRow.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: adminCookie() },
      body: JSON.stringify({ fulfillment: "cancelled" }),
    });
    assert.equal(cancelled.status, 200);
    assert.equal(used(), 0);
    assert.equal(stockOf("honest-truth"), before);

    const unknown = await checkout("honest-truth", { couponCode: "NOPE" });
    assert.equal(unknown.status, 400);
    assert.match(String(unknown.body.error), /isn't valid/);
    assert.equal(stockOf("honest-truth"), before);
  });

  it("reminds an unpaid online checkout and deletes it, and leaves cash on delivery alone", async () => {
    const before = stockOf("dark-truth");
    const unpaid = insertOrder({
      publicId: "unpaid-reminder",
      customer,
      items: [{ productId: productId("dark-truth"), name: "Dark Truth", unitPrice: 44900, quantity: 1 }],
      customerId: null,
      paymentMethod: "razorpay",
      subtotal: 44900,
      shippingPaise: 0,
      discountPaise: 0,
      couponCode: "",
      notes: "",
      idempotencyKey: "unpaid-reminder",
    });
    assert.equal(stockOf("dark-truth"), before - 1);
    const cookie = adminCookie();
    const saved = await fetch(base + "/api/admin/settings/payment-reminder", {
      method: "PUT",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ subject: "Finish {order}", body: "Hi {name}\n{items}\n{total}\n{shop}" }),
    });
    assert.equal(saved.status, 200);

    db.prepare("UPDATE orders SET razorpay_payment_id = 'pay_started' WHERE id = ?").run(unpaid);
    const blocked = await fetch(base + "/api/admin/orders/delete-unpaid", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ ids: [unpaid] }),
    });
    assert.equal(blocked.status, 400);
    assert.equal(stockOf("dark-truth"), before - 1);
    db.prepare("UPDATE orders SET razorpay_payment_id = NULL WHERE id = ?").run(unpaid);

    const reminded = await fetch(base + "/api/admin/orders/remind", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ ids: [unpaid] }),
    });
    assert.equal(reminded.status, 200);
    assert.equal(((await reminded.json()) as { sent: number }).sent, 1);
    const mail = emails.at(-1);
    assert.equal(mail?.to, customer.email);
    assert.match(mail?.subject ?? "", /BT-/);
    assert.match(mail?.text ?? "", /Asha Rao/);
    assert.match(mail?.text ?? "", /Dark Truth × 1/);

    const cod = insertOrder({
      publicId: "cod-keep",
      customer,
      items: [{ productId: productId("dark-truth"), name: "Dark Truth", unitPrice: 44900, quantity: 1 }],
      customerId: null,
      paymentMethod: "cod",
      subtotal: 44900,
      shippingPaise: 0,
      discountPaise: 0,
      couponCode: "",
      notes: "",
      idempotencyKey: "cod-keep",
    });
    const kept = await fetch(base + "/api/admin/orders/delete-unpaid", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ ids: [cod] }),
    });
    assert.equal(kept.status, 400);
    assert.ok(getOrder({ id: cod }));

    const removed = await fetch(base + "/api/admin/orders/delete-unpaid", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ ids: [unpaid] }),
    });
    assert.equal(removed.status, 200);
    assert.equal(((await removed.json()) as { deleted: number }).deleted, 1);
    assert.equal(getOrder({ id: unpaid }), undefined);
    assert.equal(stockOf("dark-truth"), before - 1);

    const cancelled = await fetch(base + `/api/admin/orders/${cod}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ fulfillment: "cancelled" }),
    });
    assert.equal(cancelled.status, 200);
    assert.equal(stockOf("dark-truth"), before);
  });
});
