import { randomBytes } from "node:crypto";
import type { AdminOrder, AdminStats, CheckoutConfig, CreateOrderResponse, CustomerDetails, Fulfillment, PaymentMethod, PaymentStatus, StoreProduct, TrackingUpdate } from "../shared/store";
import { FULFILLMENT_STATES, fulfillmentLabel } from "../shared/store";
import { canChangeFulfillment, canRefund, formatOrderCode, letterFor, parseOrderCode, phoneMatches, upiIntent } from "./commerce";
import { config } from "./config";
import { badRequest, HttpError, int, notFound, str } from "./http";
import { deliverOrderMail } from "./orderMail";
import { createRazorpayOrder, razorpayConfigured, razorpayKeyId, verifyPaymentSignature, verifyWebhookSignature, webhookConfigured } from "./razorpay";
import { readCustomerDetails } from "./validate";

const ORDER_SELECT =
  "id,public_id,razorpay_order_id,razorpay_payment_id,status,fulfillment,payment_method,subtotal,shipping_paise,amount,currency,notes,upi_reference,stock_held,confirmation_letter,customer_name,customer_email,customer_phone,address_line1,address_line2,city,state,postal_code,created_at,paid_at,order_items(product_id,name,unit_price,quantity),shipments(courier,tracking_ref,tracking_url,location,dispatched_at,delivered_at),order_updates(label,note,created_at)";

export function supabaseStoreConfigured(): boolean {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function missing(): Response {
  return json(503, { error: "The store database is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run supabase/store.sql." });
}

async function rest(path: string, init: RequestInit = {}): Promise<unknown> {
  const { url, serviceRoleKey } = config.supabase;
  let res: Response;
  try {
    res = await fetch(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new HttpError(503, "Could not reach the store database.");
  }
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!res.ok) {
    const message = typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : "";
    const code = typeof body === "object" && body && "code" in body ? String((body as { code: unknown }).code) : "";
    if (code === "PGRST205" || /relation|schema cache|could not find the (table|function)/i.test(message)) {
      throw new HttpError(503, "The store tables are missing. Run supabase/store.sql in the Supabase SQL editor.");
    }
    if (/coming soon|left in stock|no longer available|cart is empty|Invalid quantity/i.test(message)) throw badRequest(message);
    console.error("Supabase store error:", res.status, message || text);
    throw new HttpError(502, "The store database rejected the request.");
  }
  return body;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

interface ItemRow {
  product_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
}
interface ShipmentRow {
  courier: string;
  tracking_ref: string;
  tracking_url: string;
  location: string;
  dispatched_at: string | null;
  delivered_at: string | null;
}
interface UpdateRow {
  label: string;
  note: string;
  created_at: string;
}
interface OrderRow {
  id: number;
  public_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  payment_method: PaymentMethod;
  subtotal: number;
  shipping_paise: number;
  amount: number;
  currency: string;
  notes: string;
  upi_reference: string;
  stock_held: boolean;
  confirmation_letter: string;
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
  order_items?: ItemRow[] | null;
  shipments?: ShipmentRow | ShipmentRow[] | null;
  order_updates?: UpdateRow[] | null;
}

function mapOrder(row: OrderRow): AdminOrder {
  const shipment = asOne(row.shipments);
  const updates: TrackingUpdate[] = asArray<UpdateRow>(row.order_updates)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((update) => ({ label: update.label, note: update.note, at: update.created_at }));
  return {
    id: Number(row.id),
    publicId: row.public_id,
    code: formatOrderCode(Number(row.id)),
    status: row.status,
    fulfillment: row.fulfillment,
    paymentMethod: row.payment_method,
    subtotal: row.subtotal,
    shippingPaise: row.shipping_paise,
    amount: row.amount,
    currency: row.currency,
    notes: row.notes ?? "",
    upiReference: row.upi_reference ?? "",
    stockHeld: row.stock_held === true,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id,
    customerId: null,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      line1: row.address_line1,
      line2: row.address_line2 ?? "",
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
    },
    items: asArray<ItemRow>(row.order_items).map((item) => ({
      productId: item.product_id === null ? null : Number(item.product_id),
      name: item.name,
      unitPrice: item.unit_price,
      quantity: item.quantity,
    })),
    shipment: shipment
      ? {
          courier: shipment.courier ?? "",
          trackingRef: shipment.tracking_ref ?? "",
          trackingUrl: shipment.tracking_url ?? "",
          location: shipment.location ?? "",
          dispatchedAt: shipment.dispatched_at,
          deliveredAt: shipment.delivered_at,
        }
      : null,
    updates,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

async function getOrderBy(filter: string): Promise<AdminOrder | undefined> {
  const rows = asArray<OrderRow>(await rest(`orders?${filter}&select=${ORDER_SELECT}&limit=1`));
  return rows[0] ? mapOrder(rows[0]) : undefined;
}

async function listOrders(status?: string): Promise<AdminOrder[]> {
  const filter = status ? `status=eq.${encodeURIComponent(status)}&` : "";
  const rows = asArray<OrderRow>(await rest(`orders?${filter}select=${ORDER_SELECT}&order=id.desc&limit=200`));
  return rows.map(mapOrder);
}

function summary(order: AdminOrder) {
  return {
    id: order.publicId,
    number: order.id,
    code: order.code,
    status: order.status,
    fulfillment: order.fulfillment,
    paymentMethod: order.paymentMethod,
    subtotal: order.subtotal,
    shippingPaise: order.shippingPaise,
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

function tracked(order: AdminOrder) {
  const view = summary(order);
  return {
    code: view.code,
    createdAt: view.createdAt,
    items: view.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
    subtotal: view.subtotal,
    shippingPaise: view.shippingPaise,
    amount: view.amount,
    currency: view.currency,
    paymentMethod: view.paymentMethod,
    status: view.status,
    fulfillment: view.fulfillment,
    shipment: view.shipment,
    updates: view.updates,
  };
}

async function notify(order: AdminOrder): Promise<void> {
  const letter = letterFor(order.paymentMethod, order.status);
  if (!letter) return;
  const claimed = asArray<{ id: number }>(
    await rest(`orders?id=eq.${order.id}&confirmation_letter=neq.${encodeURIComponent(letter)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ confirmation_sent: true, confirmation_letter: letter }),
    }),
  );
  if (claimed.length === 0) return;
  const sent = await deliverOrderMail({
    code: order.code,
    createdAt: order.createdAt,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
    subtotal: order.subtotal,
    shippingPaise: order.shippingPaise,
    total: order.amount,
    method: order.paymentMethod,
    letter,
    addressLines: [order.customer.line1, order.customer.line2, `${order.customer.city}, ${order.customer.state} ${order.customer.postalCode}`].filter(Boolean),
  });
  if (!sent) {
    await rest(`orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ confirmation_sent: false, confirmation_letter: "" }),
    });
  }
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

async function readItems(body: unknown): Promise<{ productId: number; quantity: number }[]> {
  if (!Array.isArray(body) || body.length === 0) throw badRequest("Your cart is empty.");
  if (body.length > 50) throw badRequest("Too many items in one order.");
  const quantities = new Map<number, number>();
  for (const raw of body as Record<string, unknown>[]) {
    const productId = int(raw?.productId, "Product", { min: 1 });
    const quantity = int(raw?.quantity, "Quantity", { min: 1, max: 99 });
    quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

function orderPayload(order: AdminOrder): CreateOrderResponse {
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

async function failOrder(order: AdminOrder): Promise<void> {
  if (order.status !== "pending") return;
  const rows = asArray<{ id: number }>(
    await rest(`orders?id=eq.${order.id}&status=eq.pending&select=id`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "failed", idempotency_key: null }),
    }),
  );
  if (rows.length === 0) return;
  await rest("rpc/release_order_stock", { method: "POST", body: JSON.stringify({ target_id: order.id }) });
}

async function markPaid(order: AdminOrder, paymentId: string, paidAmount?: number): Promise<AdminOrder> {
  if (order.status === "paid") return order;
  if (paidAmount !== undefined && paidAmount !== order.amount) return order;
  if (order.status !== "pending") return order;
  const rows = asArray<{ id: number }>(
    await rest(`orders?id=eq.${order.id}&status=eq.pending&select=id`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() }),
    }),
  );
  if (rows.length === 0 && order.status === "pending") {
    const again = await getOrderBy(`id=eq.${order.id}`);
    return again ?? order;
  }
  return (await getOrderBy(`id=eq.${order.id}`)) ?? order;
}

async function createCheckout(body: Record<string, unknown>): Promise<{ order: AdminOrder; created: boolean }> {
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 80) : "";
  const items = await readItems(body.items);
  const customer: CustomerDetails = readCustomerDetails(body.customer);
  const method = readMethod(body.paymentMethod);
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
  if (!Number.isInteger(config.shipping.paise) || config.shipping.paise < 0) throw badRequest("Shipping charge is not configured.");
  const publicId = randomBytes(12).toString("base64url");
  const id = Number(
    await rest("rpc/place_order", {
      method: "POST",
      body: JSON.stringify({
        payload: {
          publicId,
          paymentMethod: method,
          shippingPaise: config.shipping.paise,
          notes,
          idempotencyKey,
          customer,
          items,
        },
      }),
    }),
  );
  const order = await getOrderBy(`id=eq.${id}`);
  if (!order) throw new HttpError(502, "The order was saved but could not be read back.");
  return { order, created: order.publicId === publicId };
}

async function attachRazorpay(order: AdminOrder): Promise<AdminOrder> {
  if (order.razorpayOrderId) return order;
  try {
    const rzp = await createRazorpayOrder(order.amount, order.publicId.slice(0, 40));
    const rows = asArray<OrderRow>(
      await rest(`orders?id=eq.${order.id}&select=${ORDER_SELECT}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ razorpay_order_id: rzp.id }),
      }),
    );
    return rows[0] ? mapOrder(rows[0]) : { ...order, razorpayOrderId: rzp.id };
  } catch (err) {
    await failOrder(order);
    throw err;
  }
}

function mapProduct(row: Record<string, unknown>): StoreProduct {
  const images = row.images;
  return {
    id: Number(row.id),
    slug: String(row.slug),
    sku: String(row.sku ?? ""),
    name: String(row.name),
    description: String(row.description ?? ""),
    price: Number(row.price),
    stock: Number(row.stock),
    images: Array.isArray(images) ? images.map(String) : [],
    active: row.active === true,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function products(activeOnly: boolean): Promise<StoreProduct[]> {
  const filter = activeOnly ? "active=eq.true&" : "";
  const rows = asArray<Record<string, unknown>>(await rest(`products?${filter}select=*&order=id.asc`));
  return rows.map(mapProduct);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function stats(): Promise<AdminStats> {
  const orders = await listOrders();
  const catalog = await products(false);
  const paid = (order: AdminOrder) => order.status === "paid" && order.fulfillment !== "cancelled";
  return {
    revenue: orders.filter(paid).reduce((sum, order) => sum + order.amount, 0),
    refunded: orders.filter((order) => order.status === "refunded").reduce((sum, order) => sum + order.amount, 0),
    pendingValue: orders.filter((order) => order.status === "pending").reduce((sum, order) => sum + order.amount, 0),
    codOutstanding: orders.filter((order) => order.status === "pending" && order.paymentMethod === "cod").reduce((sum, order) => sum + order.amount, 0),
    paidOrders: orders.filter((order) => order.status === "paid").length,
    pendingOrders: orders.filter((order) => order.status === "pending").length,
    awaitingVerification: orders.filter((order) => order.status === "pending" && order.paymentMethod === "upi").length,
    unfulfilledOrders: orders.filter((order) => order.status === "paid" && (order.fulfillment === "unfulfilled" || order.fulfillment === "packed")).length,
    shippedOrders: orders.filter((order) => order.fulfillment === "shipped" || order.fulfillment === "out_for_delivery").length,
    deliveredOrders: orders.filter((order) => order.fulfillment === "delivered").length,
    cancelledOrders: orders.filter((order) => order.fulfillment === "cancelled" || order.status === "refunded").length,
    products: catalog.length,
    lowStock: catalog.filter((product) => product.active && product.stock <= 5).map((product) => ({ id: product.id, name: product.name, stock: product.stock })),
    recentOrders: orders.slice(0, 8),
  };
}

async function saveShipment(order: AdminOrder, body: Record<string, unknown>): Promise<void> {
  const courier = str(body.courier, "Courier", { max: 80, optional: true });
  const trackingRef = str(body.trackingRef, "Tracking reference", { max: 80, optional: true });
  const trackingUrl = str(body.trackingUrl, "Tracking URL", { max: 300, optional: true });
  const location = str(body.location, "Where it has reached", { max: 160, optional: true });
  const note = str(body.note, "Tracking note", { max: 240, optional: true });
  if (trackingUrl && !/^https:\/\//.test(trackingUrl)) throw badRequest("Tracking URL must start with https://");
  await rest("shipments?on_conflict=order_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ order_id: order.id, courier, tracking_ref: trackingRef, tracking_url: trackingUrl, location, updated_at: new Date().toISOString() }),
  });
  if (note) {
    await rest("order_updates", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ order_id: order.id, label: "Update", note }) });
  } else if (location && location !== (order.shipment?.location ?? "")) {
    await rest("order_updates", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ order_id: order.id, label: "Reached", note: location }) });
  }
}

export async function handlePublicStore(req: Request, path: string): Promise<Response | null> {
  const storePath =
    path === "/api/products" ||
    path.startsWith("/api/products/") ||
    path.startsWith("/api/checkout") ||
    path === "/api/track" ||
    path.startsWith("/api/orders/") ||
    path === "/api/webhooks/razorpay";
  if (!storePath) return null;
  if (!supabaseStoreConfigured()) return missing();

  if (req.method === "GET" && path === "/api/products") return json(200, await products(true));
  if (req.method === "GET" && path.startsWith("/api/products/")) {
    const slug = decodeURIComponent(path.slice("/api/products/".length));
    const product = (await products(true)).find((item) => item.slug === slug);
    if (!product) throw notFound("Product not found.");
    return json(200, product);
  }

  if (req.method === "GET" && path === "/api/checkout/config") {
    const body: CheckoutConfig = {
      testPayments: config.testPayments,
      shippingPaise: config.shipping.paise,
      shippingConfigured: config.shipping.configured,
      methods: paymentMethods(),
      upi: config.upi.vpa ? { vpa: config.upi.vpa, payee: config.upi.payee } : null,
      supportEmail: config.supportEmail,
    };
    return json(200, body);
  }

  if (req.method === "POST" && path === "/api/checkout/order") {
    const { order, created } = await createCheckout((await req.json()) as Record<string, unknown>);
    if (!created && order.razorpayOrderId) return json(200, orderPayload(order));
    if (order.paymentMethod !== "razorpay") {
      await notify(order);
      return json(created ? 201 : 200, orderPayload(order));
    }
    const paying = await attachRazorpay(order);
    return json(201, orderPayload(paying));
  }

  if (req.method === "POST" && path === "/api/checkout/verify") {
    const body = (await req.json()) as Record<string, unknown>;
    const orderId = str(body.razorpay_order_id, "razorpay_order_id", { max: 100 });
    const paymentId = str(body.razorpay_payment_id, "razorpay_payment_id", { max: 100 });
    const signature = str(body.razorpay_signature, "razorpay_signature", { max: 200 });
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      throw new HttpError(400, "Payment could not be verified. If money was deducted, contact us with your payment ID.");
    }
    const existing = await getOrderBy(`razorpay_order_id=eq.${encodeURIComponent(orderId)}`);
    if (!existing) throw notFound("Order not found.");
    const paid = await markPaid(existing, paymentId);
    if (paid.status !== "paid") throw new HttpError(400, "Payment amount did not match this order.");
    await notify(paid);
    return json(200, { orderId: paid.publicId });
  }

  if (req.method === "POST" && path === "/api/checkout/simulate") {
    if (!config.testPayments) throw notFound();
    const body = (await req.json()) as Record<string, unknown>;
    if (body.outcome !== "success" && body.outcome !== "failure") throw badRequest("outcome must be success or failure.");
    const { order } = await createCheckout(body);
    const simulated = `order_sim_${randomBytes(6).toString("hex")}`;
    await rest(`orders?id=eq.${order.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ razorpay_order_id: simulated }) });
    if (body.outcome === "success") {
      const paid = await markPaid({ ...order, razorpayOrderId: simulated }, `pay_sim_${randomBytes(6).toString("hex")}`);
      await notify(paid);
    } else await failOrder(order);
    return json(201, { orderId: order.publicId });
  }

  if (req.method === "POST" && path === "/api/track") {
    const body = (await req.json()) as { orderCode?: unknown; phone?: unknown };
    const id = parseOrderCode(typeof body.orderCode === "string" ? body.orderCode : "");
    const phone = typeof body.phone === "string" ? body.phone : "";
    const order = id ? await getOrderBy(`id=eq.${id}`) : undefined;
    if (!order || !phoneMatches(order.customer.phone, phone)) {
      throw notFound("We couldn't find an order with that number and phone.");
    }
    return json(200, tracked(order));
  }

  const publicOrder = path.match(/^\/api\/orders\/([^/]+)$/);
  if (req.method === "GET" && publicOrder) {
    const order = await getOrderBy(`public_id=eq.${encodeURIComponent(decodeURIComponent(publicOrder[1]))}`);
    if (!order) throw notFound("Order not found.");
    return json(200, summary(order));
  }

  const upi = path.match(/^\/api\/orders\/([^/]+)\/upi-reference$/);
  if (req.method === "POST" && upi) {
    const order = await getOrderBy(`public_id=eq.${encodeURIComponent(decodeURIComponent(upi[1]))}`);
    if (!order || order.paymentMethod !== "upi" || order.status !== "pending") throw notFound("Order not found.");
    const reference = str(((await req.json()) as { reference?: unknown }).reference, "UPI reference", { max: 80 });
    await rest(`orders?id=eq.${order.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ upi_reference: reference }) });
    return json(200, { ok: true });
  }

  if (req.method === "POST" && path === "/api/webhooks/razorpay") {
    const raw = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";
    if (!webhookConfigured || !signature || !verifyWebhookSignature(Buffer.from(raw), signature)) return json(400, { error: "Invalid signature." });
    const event = JSON.parse(raw) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } } } };
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment.id) {
      const existing = await getOrderBy(`razorpay_order_id=eq.${encodeURIComponent(payment.order_id)}`);
      if (existing && (event.event === "order.paid" || event.event === "payment.captured")) {
        const amountMatches = typeof payment.amount !== "number" || payment.amount === existing.amount;
        if (amountMatches && (!payment.currency || payment.currency === "INR")) {
          const paid = await markPaid(existing, payment.id, payment.amount);
          if (paid.status === "paid") await notify(paid);
        }
      }
      if (existing && event.event === "payment.failed") await failOrder(existing);
    }
    return json(200, { ok: true });
  }

  return json(404, { error: "Not found." });
}

export async function handleAdminStore(req: Request, path: string): Promise<Response | null> {
  const adminPath = path === "/api/admin/stats" || path.startsWith("/api/admin/orders") || path.startsWith("/api/admin/products");
  if (!adminPath) return null;
  if (!supabaseStoreConfigured()) return missing();

  if (req.method === "GET" && path === "/api/admin/stats") return json(200, await stats());

  if (req.method === "GET" && path === "/api/admin/orders") {
    const status = new URL(req.url).searchParams.get("status") ?? "";
    if (status && !["pending", "paid", "failed", "refunded"].includes(status)) throw badRequest("Unknown status.");
    return json(200, await listOrders(status || undefined));
  }

  const one = path.match(/^\/api\/admin\/orders\/(\d+)$/);
  if (one && req.method === "GET") {
    const order = await getOrderBy(`id=eq.${one[1]}`);
    if (!order) throw notFound("Order not found.");
    return json(200, order);
  }

  if (one && req.method === "PATCH") {
    const order = await getOrderBy(`id=eq.${one[1]}`);
    if (!order) throw notFound("Order not found.");
    const body = (await req.json()) as { fulfillment?: Fulfillment; shipment?: Record<string, unknown> };
    if (body.fulfillment !== undefined) {
      const fulfillment = body.fulfillment;
      if (!FULFILLMENT_STATES.includes(fulfillment)) throw badRequest("Unknown fulfilment status.");
      const problem = canChangeFulfillment(order.fulfillment, fulfillment, { status: order.status, method: order.paymentMethod });
      if (problem) throw badRequest(problem);
      if (fulfillment === "cancelled" && order.fulfillment !== "cancelled") await rest("rpc/release_order_stock", { method: "POST", body: JSON.stringify({ target_id: order.id }) });
      await rest(`orders?id=eq.${order.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ fulfillment }) });
      const now = new Date().toISOString();
      if (fulfillment === "shipped" || fulfillment === "out_for_delivery" || fulfillment === "delivered") {
        await rest("shipments?on_conflict=order_id", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify({
            order_id: order.id,
            ...(fulfillment === "delivered" ? { delivered_at: now } : { dispatched_at: order.shipment?.dispatchedAt ?? now }),
            updated_at: now,
          }),
        });
      }
      if (fulfillment !== order.fulfillment) {
        await rest("order_updates", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ order_id: order.id, label: fulfillmentLabel[fulfillment], note: "" }),
        });
      }
    }
    if (body.shipment) await saveShipment(order, body.shipment);
    const saved = await getOrderBy(`id=eq.${order.id}`);
    return json(200, saved);
  }

  const action = path.match(/^\/api\/admin\/orders\/(\d+)\/(verify-payment|refund|resend-email)$/);
  if (action && req.method === "POST") {
    const order = await getOrderBy(`id=eq.${action[1]}`);
    if (!order) throw notFound("Order not found.");
    if (action[2] === "resend-email") {
      const letter = letterFor(order.paymentMethod, order.status);
      if (!letter) throw badRequest("There is no email for this order yet.");
      const sent = await deliverOrderMail({
        code: order.code,
        createdAt: order.createdAt,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        items: order.items,
        subtotal: order.subtotal,
        shippingPaise: order.shippingPaise,
        total: order.amount,
        method: order.paymentMethod,
        letter,
        addressLines: [order.customer.line1, order.customer.line2, `${order.customer.city}, ${order.customer.state} ${order.customer.postalCode}`].filter(Boolean),
      });
      if (!sent) throw new HttpError(502, "The email provider did not accept the message.");
      return json(200, { ok: true });
    }
    if (action[2] === "verify-payment") {
      if (order.paymentMethod === "razorpay") throw badRequest("Razorpay payments are verified from the payment signature, not by hand.");
      if (order.status === "paid") return json(200, order);
      if (order.status !== "pending") throw badRequest("This payment can no longer be verified.");
      const paid = await markPaid(order, order.paymentMethod === "upi" ? order.upiReference || "verified-by-admin" : "cod-collected");
      await notify(paid);
      return json(200, await getOrderBy(`id=eq.${order.id}`));
    }
    const problem = canRefund(order.status, order.fulfillment);
    if (problem) throw badRequest(problem);
    await rest(`orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "refunded", fulfillment: "cancelled" }),
    });
    await rest("rpc/release_order_stock", { method: "POST", body: JSON.stringify({ target_id: order.id }) });
    return json(200, await getOrderBy(`id=eq.${order.id}`));
  }

  if (req.method === "GET" && path === "/api/admin/products") return json(200, await products(false));
  const product = path.match(/^\/api\/admin\/products\/(\d+)$/);
  if (product && req.method === "GET") {
    const found = (await products(false)).find((item) => item.id === Number(product[1]));
    if (!found) throw notFound("Product not found.");
    return json(200, found);
  }
  if (req.method === "POST" && path === "/api/admin/products") {
    const body = (await req.json()) as Record<string, unknown>;
    const name = str(body.name, "Name", { max: 120 });
    const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : name) || "product";
    const created = asArray<Record<string, unknown>>(
      await rest("products", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          slug,
          sku: str(body.sku || slug, "SKU", { max: 80 }),
          name,
          description: str(body.description, "Description", { max: 5000, optional: true }),
          price: int(body.price, "Price (in paise)", { min: 100, max: 10_000_000 }),
          stock: int(body.stock, "Stock", { min: 0, max: 1_000_000 }),
          active: body.active !== false,
        }),
      }),
    );
    return json(201, mapProduct(created[0] ?? {}));
  }
  if (product && req.method === "PATCH") {
    const existing = (await products(false)).find((item) => item.id === Number(product[1]));
    if (!existing) throw notFound("Product not found.");
    const body = (await req.json()) as Record<string, unknown>;
    const updated = asArray<Record<string, unknown>>(
      await rest(`products?id=eq.${existing.id}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          name: str(body.name ?? existing.name, "Name", { max: 120 }),
          description: str(body.description ?? existing.description, "Description", { max: 5000, optional: true }),
          price: int(body.price ?? existing.price, "Price (in paise)", { min: 100, max: 10_000_000 }),
          stock: int(body.stock ?? existing.stock, "Stock", { min: 0, max: 1_000_000 }),
          active: typeof body.active === "boolean" ? body.active : existing.active,
          updated_at: new Date().toISOString(),
        }),
      }),
    );
    return json(200, mapProduct(updated[0] ?? {}));
  }
  if (product && req.method === "DELETE") {
    await rest(`products?id=eq.${product[1]}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    return json(200, { ok: true });
  }
  if (path.includes("/images")) return json(400, { error: "Image upload needs the local server. Set image URLs in Supabase for now." });

  return json(404, { error: "Not found." });
}
