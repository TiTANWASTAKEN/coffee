import { randomBytes } from "node:crypto";
import express, { Router, type Request } from "express";
import type { CheckoutConfig, CreateOrderResponse, OrderItem, PaymentMethod } from "../../shared/store";
import { contactMatches, parseOrderCode, quote, upiIntent } from "../commerce";
import { config } from "../config";
import { rememberAddress } from "../customers";
import { currentCustomer } from "../customerSession";
import { findIdempotentOrder, getOrder, getProductById, getProductBySlug, insertOrder, listProducts, markOrderFailed, markOrderPaid, db, recordAdminEvent, releaseStock, toOrderSummary, toTrackedOrder } from "../db";
import { badRequest, HttpError, int, notFound, str } from "../http";
import { notifyOrderOnce } from "../notify";
import { rateLimit } from "../rateLimit";
import { readCustomerDetails } from "../validate";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, verifyPaymentSignature, verifyWebhookSignature, webhookConfigured } from "../razorpay";

export const storeRouter = Router();

const checkoutLimit = rateLimit({ max: 20, windowMinutes: 15, message: "Too many checkout attempts. Try again in a few minutes." });

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

function paymentMethods(): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  if (razorpayConfigured) methods.push("razorpay");
  if (config.codEnabled) methods.push("cod");
  if (config.upi.vpa) methods.push("upi");
  return methods;
}

function readMethod(value: unknown): PaymentMethod {
  const methods = paymentMethods();
  const requested = value === "cod" || value === "upi" || value === "razorpay" ? value : methods[0];
  if (!requested || !methods.includes(requested)) throw badRequest("No payment method is available. Check the store configuration.");
  return requested;
}

/** Validates the cart + details and records a pending order, linked to the signed-in customer if any. */
function createPendingOrder(req: Request) {
  const idempotencyKey = typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey.trim().slice(0, 80) : "";
  if (idempotencyKey) {
    const existing = findIdempotentOrder(idempotencyKey);
    if (existing && existing.status !== "failed") return { items: existing.items, publicId: existing.publicId, orderId: existing.id, reused: true as const };
  }

  const items = readItems(req.body?.items);
  const customer = readCustomerDetails(req.body?.customer);
  const method = readMethod(req.body?.paymentMethod);
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim().slice(0, 500) : "";
  const priced = quote(items, config.shipping.paise);
  const account = currentCustomer(req);
  const publicId = randomBytes(12).toString("base64url");

  let orderId: number;
  try {
    orderId = insertOrder({
      publicId,
      customer,
      items,
      customerId: account?.id ?? null,
      paymentMethod: method,
      subtotal: priced.subtotal,
      shippingPaise: priced.shippingPaise,
      notes,
      idempotencyKey: idempotencyKey || null,
    });
  } catch (err) {
    if (err instanceof Error && /stock|sold out/.test(err.message)) throw badRequest(err.message);
    throw err;
  }
  if (account && req.body?.saveAddress === true) rememberAddress(account.id, customer);
  return { items, publicId, orderId, reused: false as const };
}

function orderPayload(orderId: number): CreateOrderResponse {
  const order = getOrder({ id: orderId });
  if (!order) throw notFound("Order not found.");
  const response: CreateOrderResponse = {
    orderId: order.publicId,
    orderCode: order.code,
    amount: order.amount,
    subtotal: order.subtotal,
    shippingPaise: order.shippingPaise,
    currency: order.currency,
    paymentMethod: order.paymentMethod,
  };
  if (order.razorpayOrderId) {
    response.razorpayOrderId = order.razorpayOrderId;
    response.keyId = razorpayKeyId;
  }
  if (order.paymentMethod === "upi" && config.upi.vpa) {
    response.upi = { vpa: config.upi.vpa, payee: config.upi.payee, intent: upiIntent({ vpa: config.upi.vpa, payee: config.upi.payee, amountPaise: order.amount, orderCode: order.code }) };
  }
  return response;
}

storeRouter.post("/checkout/order", checkoutLimit, async (req, res) => {
  const created = createPendingOrder(req);
  const order = getOrder({ id: created.orderId });
  if (!order) throw notFound("Order not found.");

  if (created.reused && order.razorpayOrderId) {
    res.status(200).json(orderPayload(order.id));
    return;
  }

  if (order.paymentMethod !== "razorpay") {
    await notifyOrderOnce(order.id);
    res.status(201).json(orderPayload(order.id));
    return;
  }

  try {
    const rzp = await createRazorpayOrder(order.amount, order.publicId.slice(0, 40));
    db.prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?").run(rzp.id, order.id);
    db.prepare("UPDATE payments SET provider_order_id = ? WHERE order_id = ? AND status = 'pending'").run(rzp.id, order.id);
    res.status(201).json(orderPayload(order.id));
  } catch (err) {
    db.prepare("UPDATE orders SET status = 'failed', idempotency_key = NULL WHERE id = ? AND status = 'pending'").run(order.id);
    db.prepare("UPDATE payments SET status = 'failed' WHERE order_id = ? AND status = 'pending'").run(order.id);
    const failed = getOrder({ id: order.id });
    if (failed) releaseStock(failed);
    throw err;
  }
});

storeRouter.get("/checkout/config", (_req, res) => {
  const body: CheckoutConfig = {
    testPayments: config.testPayments,
    shippingPaise: config.shipping.paise,
    shippingConfigured: config.shipping.configured,
    methods: paymentMethods(),
    upi: config.upi.vpa ? { vpa: config.upi.vpa, payee: config.upi.payee } : null,
    supportEmail: config.supportEmail,
  };
  res.json(body);
});

/**
 * TEST_PAYMENTS=true only. Creates the order and settles it without Razorpay,
 * so the success and failure flows can be tried end to end.
 */
storeRouter.post("/checkout/simulate", checkoutLimit, async (req, res) => {
  if (!config.testPayments) throw notFound();
  const outcome = req.body?.outcome;
  if (outcome !== "success" && outcome !== "failure") throw badRequest("outcome must be success or failure.");

  const { publicId, orderId } = createPendingOrder(req);
  const simulatedOrderId = `order_sim_${randomBytes(6).toString("hex")}`;
  db.prepare("UPDATE orders SET razorpay_order_id = ? WHERE id = ?").run(simulatedOrderId, orderId);

  if (outcome === "success") {
    const paid = markOrderPaid(simulatedOrderId, `pay_sim_${randomBytes(6).toString("hex")}`);
    if (paid) await notifyOrderOnce(paid.id);
  } else markOrderFailed(simulatedOrderId);
  res.status(201).json({ orderId: publicId });
});

storeRouter.post("/checkout/verify", checkoutLimit, async (req, res) => {
  const orderId = str(req.body?.razorpay_order_id, "razorpay_order_id", { max: 100 });
  const paymentId = str(req.body?.razorpay_payment_id, "razorpay_payment_id", { max: 100 });
  const signature = str(req.body?.razorpay_signature, "razorpay_signature", { max: 200 });

  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw new HttpError(400, "Payment could not be verified. If money was deducted, contact us with your payment ID.");
  }
  const order = markOrderPaid(orderId, paymentId);
  if (!order) throw notFound("Order not found.");
  if (order.status !== "paid") throw new HttpError(400, "Payment amount did not match this order.");
  await notifyOrderOnce(order.id);
  res.json({ orderId: order.publicId });
});

storeRouter.post("/orders/:publicId/upi-reference", (req, res) => {
  const order = getOrder({ publicId: req.params.publicId });
  if (!order || order.paymentMethod !== "upi" || order.status !== "pending") throw notFound("Order not found.");
  const reference = str(req.body?.reference, "UPI reference", { max: 80 });
  db.prepare("UPDATE orders SET upi_reference = ? WHERE id = ?").run(reference, order.id);
  recordAdminEvent(order.id, "upi_reference", "Customer submitted a UPI reference. Payment is still unverified.");
  res.json({ ok: true });
});

const trackLimit = rateLimit({ max: 8, windowMinutes: 15, message: "Too many tracking attempts. Try again in a few minutes." });

storeRouter.post("/track", trackLimit, (req, res) => {
  const code = typeof req.body?.orderCode === "string" ? req.body.orderCode : "";
  const contact = typeof req.body?.contact === "string" ? req.body.contact : "";
  const id = parseOrderCode(code);
  const order = id ? getOrder({ id }) : undefined;
  if (!order || !contactMatches(order.customer, contact)) {
    throw notFound("We couldn't find an order with those details.");
  }
  res.json(toTrackedOrder(order));
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
  async (req: express.Request, res: express.Response) => {
    const signature = req.header("x-razorpay-signature");
    if (!webhookConfigured || !signature || !Buffer.isBuffer(req.body) || !verifyWebhookSignature(req.body, signature)) {
      res.status(400).json({ error: "Invalid signature." });
      return;
    }

    const event = JSON.parse(req.body.toString("utf8")) as {
      event: string;
      payload?: { payment?: { entity?: { id: string; order_id: string } } };
    };
    const payment = event.payload?.payment?.entity as { id: string; order_id: string; amount?: number; currency?: string } | undefined;
    if (payment?.order_id) {
      if (event.event === "order.paid" || event.event === "payment.captured") {
        const amountMatches = typeof payment.amount === "number" && (!payment.currency || payment.currency === "INR");
        const order = amountMatches ? markOrderPaid(payment.order_id, payment.id, payment.amount) : undefined;
        if (order?.status === "paid") await notifyOrderOnce(order.id);
      }
      if (event.event === "payment.failed") markOrderFailed(payment.order_id);
    }
    res.json({ ok: true });
  },
];
