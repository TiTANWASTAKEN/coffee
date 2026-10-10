import { randomBytes } from "node:crypto";
import express, { Router, type Request } from "express";
import type { CreateOrderResponse, OrderItem } from "../../shared/store";
import { config } from "../config";
import { rememberAddress } from "../customers";
import { currentCustomer } from "../customerSession";
import { getOrder, getProductById, getProductBySlug, insertOrder, listProducts, markOrderFailed, markOrderPaid, db, toOrderSummary } from "../db";
import { badRequest, HttpError, int, notFound, str } from "../http";
import { readCustomerDetails } from "../validate";
import { createRazorpayOrder, razorpayKeyId, verifyPaymentSignature, verifyWebhookSignature, webhookConfigured } from "../razorpay";

export const storeRouter = Router();

// ---------- Catalogue ----------

storeRouter.get("/products", (_req, res) => {
  res.json(listProducts({ activeOnly: true }));
});

storeRouter.get("/products/:slug", (req, res) => {
  const product = getProductBySlug(req.params.slug);
  if (!product || !product.active) throw notFound("Product not found.");
  res.json(product);
});

// ---------- Checkout ----------

function readItems(body: unknown): OrderItem[] {
  if (!Array.isArray(body) || body.length === 0) throw badRequest("Your cart is empty.");
  if (body.length > 50) throw badRequest("Too many items in one order.");

  const quantities = new Map<number, number>();
  for (const raw of body as Record<string, unknown>[]) {
    const productId = int(raw?.productId, "Product", { min: 1 });
    const quantity = int(raw?.quantity, "Quantity", { min: 1, max: 99 });
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }

  // Prices always come from the database, never from the browser.
  return [...quantities].map(([productId, quantity]) => {
    const product = getProductById(productId);
    if (!product || !product.active) throw badRequest("An item in your cart is no longer available.");
    if (product.stock < quantity) {
      throw badRequest(product.stock === 0 ? `${product.name} is sold out.` : `Only ${product.stock} of ${product.name} left in stock.`);
    }
    return { productId, name: product.name, unitPrice: product.price, quantity };
  });
}

/** Validates the cart + details and records a pending order, linked to the signed-in customer if any. */
function createPendingOrder(req: Request) {
  const items = readItems(req.body?.items);
  const customer = readCustomerDetails(req.body?.customer);
  const account = currentCustomer(req);

  const publicId = randomBytes(12).toString("base64url");
  const orderId = insertOrder(publicId, customer, items, account?.id ?? null);
  if (account && req.body?.saveAddress === true) rememberAddress(account.id, customer);
  return { items, publicId, orderId };
}

storeRouter.post("/checkout/order", async (req, res) => {
  const { items, publicId, orderId } = createPendingOrder(req);
  const amount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  try {
    const rzp = await createRazorpayOrder(amount, publicId.slice(0, 40));
    db.prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?").run(rzp.id, orderId);
    const response: CreateOrderResponse = { orderId: publicId, razorpayOrderId: rzp.id, keyId: razorpayKeyId, amount, currency: rzp.currency };
    res.status(201).json(response);
  } catch (err) {
    db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
    throw err;
  }
});

storeRouter.get("/checkout/config", (_req, res) => {
  res.json({ testPayments: config.testPayments });
});

/**
 * TEST_PAYMENTS=true only. Creates the order and settles it without Razorpay,
 * so the success and failure flows can be tried end to end.
 */
storeRouter.post("/checkout/simulate", (req, res) => {
  if (!config.testPayments) throw notFound();
  const outcome = req.body?.outcome;
  if (outcome !== "success" && outcome !== "failure") throw badRequest("outcome must be success or failure.");

  const { publicId, orderId } = createPendingOrder(req);
  const simulatedOrderId = `order_sim_${randomBytes(6).toString("hex")}`;
  db.prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?").run(simulatedOrderId, orderId);

  if (outcome === "success") markOrderPaid(simulatedOrderId, `pay_sim_${randomBytes(6).toString("hex")}`);
  else markOrderFailed(simulatedOrderId);
  res.status(201).json({ orderId: publicId });
});

storeRouter.post("/checkout/verify", (req, res) => {
  const orderId = str(req.body?.razorpay_order_id, "razorpay_order_id", { max: 100 });
  const paymentId = str(req.body?.razorpay_payment_id, "razorpay_payment_id", { max: 100 });
  const signature = str(req.body?.razorpay_signature, "razorpay_signature", { max: 200 });

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw new HttpError(400, "Payment could not be verified. If money was deducted, contact us with your payment ID.");
  }
  const order = markOrderPaid(orderId, paymentId);
  if (!order) throw notFound("Order not found.");
  res.json({ orderId: order.publicId });
});

storeRouter.get("/orders/:publicId", (req, res) => {
  const order = getOrder({ publicId: req.params.publicId });
  if (!order) throw notFound("Order not found.");
  res.json(toOrderSummary(order));
});

// ---------- Webhook ----------

/**
 * Razorpay → Settings → Webhooks. Subscribe to `order.paid` and `payment.failed`.
 * Catches payments where the customer closed the tab before we could verify them.
 * Needs the raw body for the signature, so it is mounted before express.json().
 */
export const razorpayWebhook = [
  express.raw({ type: "application/json", limit: "1mb" }),
  (req: express.Request, res: express.Response) => {
    const signature = req.header("x-razorpay-signature");
    if (!webhookConfigured || !signature || !Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
      res.status(400).json({ error: "Invalid signature." });
      return;
    }

    const event = JSON.parse(req.body.toString("utf8")) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string } } };
    };
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id) {
      if (event.event === "order.paid" || event.event === "payment.captured") markOrderPaid(payment.order_id, payment.id);
      if (event.event === "payment.failed") markOrderFailed(payment.order_id);
    }
    res.json({ ok: true });
  },
];
