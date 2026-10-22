import { nextFulfillments, type Fulfillment, type PaymentMethod, type PaymentStatus } from "../shared/store";

/** Stock is reduced with this statement so two checkouts cannot sell the same unit. */
export const RESERVE_STOCK_SQL =
  "UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND active = 1 AND stock >= ?";

export const RELEASE_STOCK_SQL = "UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ?";

export interface PricedLine {
  unitPrice: number;
  quantity: number;
}

export interface Quote {
  subtotal: number;
  shippingPaise: number;
  discountPaise: number;
  total: number;
}

const COUPON_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isCouponCode(code: string): boolean {
  return /^[A-Z0-9-]{3,20}$/.test(code);
}

/** A short code such as BT7K2Q. The caller checks that it is not already in use. */
export function generateCouponCode(): string {
  let code = "BT";
  for (let i = 0; i < 6; i++) code += COUPON_ALPHABET[Math.floor(Math.random() * COUPON_ALPHABET.length)];
  return code;
}

export function couponOfferError(kind: string, value: number): string | null {
  if (kind !== "flat" && kind !== "percent") return "Choose a rupee amount or a percent.";
  if (kind === "percent") {
    if (!Number.isInteger(value) || value < 1 || value > 100) return "Percent must be between 1 and 100.";
    return null;
  }
  if (!Number.isInteger(value) || value < 100 || value > 10_000_000) return "The discount must be at least ₹1.";
  return null;
}

/** Paise off the coffee. Percent uses whole paise, rounded down. */
export function couponDiscount(subtotal: number, kind: "flat" | "percent", value: number): number {
  if (subtotal <= 0) return 0;
  if (kind === "percent") return Math.min(subtotal, Math.floor((subtotal * value) / 100));
  return Math.min(subtotal, Math.max(0, value));
}

/** Leaves at least ₹1 to pay when the order can cover it. Shipping is never discounted. */
export function payableDiscount(subtotal: number, shippingPaise: number, discountPaise: number): number {
  if (!Number.isInteger(discountPaise) || discountPaise < 0) throw new Error("Invalid discount.");
  const offered = Math.min(discountPaise, Math.max(0, subtotal));
  const undiscounted = subtotal + shippingPaise;
  if (undiscounted >= 100 && undiscounted - offered < 100) return undiscounted - 100;
  return offered;
}

/** Shipping is whatever the operator configured. This function does not invent a rate. */
export function quote(items: PricedLine[], shippingPaise: number, discountPaise = 0): Quote {
  if (!Number.isInteger(shippingPaise) || shippingPaise < 0 || shippingPaise > 10_000_000) {
    throw new Error("Shipping charge is not configured as a whole number of paise.");
  }
  if (items.length === 0) throw new Error("Cart is empty.");
  let subtotal = 0;
  for (const item of items) {
    if (!Number.isInteger(item.unitPrice) || item.unitPrice < 0) throw new Error("Invalid price.");
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) throw new Error("Invalid quantity.");
    subtotal += item.unitPrice * item.quantity;
  }
  const discount = payableDiscount(subtotal, shippingPaise, discountPaise);
  return { subtotal, shippingPaise, discountPaise: discount, total: subtotal - discount + shippingPaise };
}

export function formatOrderCode(id: number): string {
  return `BT-${String(id).padStart(4, "0")}`;
}

/** Accepts BT-0012 or 12. Returns null when the text is not an order code. */
export function parseOrderCode(input: string): number | null {
  const match = input.trim().toUpperCase().match(/^(?:BT-)?(\d{1,9})$/);
  if (!match) return null;
  const id = Number(match[1]);
  return id > 0 ? id : null;
}

function digits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/** Last 10 digits, so +91 98100 12345 and 9810012345 are the same number. */
export function phoneMatches(orderPhone: string, given: string): boolean {
  const givenDigits = digits(given);
  const orderDigits = digits(orderPhone);
  return givenDigits.length === 10 && orderDigits.length === 10 && givenDigits === orderDigits;
}

/**
 * Email must match exactly. A phone matches on the last 10 digits.
 * Anything else does not match.
 */
export function contactMatches(order: { email: string; phone: string }, given: string): boolean {
  const value = given.trim().toLowerCase();
  if (!value) return false;
  if (value.includes("@")) return value === order.email.trim().toLowerCase();
  return phoneMatches(order.phone, value);
}

export { nextFulfillments };

export function canChangeFulfillment(from: Fulfillment, to: Fulfillment, payment: { status: PaymentStatus; method: PaymentMethod }): string | null {
  if (from === to) return null;
  if (!nextFulfillments(from).includes(to)) return `An order that is ${from} cannot move to ${to}.`;
  const dispatching = to === "packed" || to === "shipped" || to === "out_for_delivery" || to === "delivered";
  if (dispatching && payment.method !== "cod" && payment.status !== "paid") {
    return "Verify the payment before packing or shipping this order.";
  }
  return null;
}

export function canRefund(status: PaymentStatus, fulfillment: Fulfillment): string | null {
  if (status !== "paid") return "Only a verified payment can be refunded.";
  if (fulfillment === "delivered" || fulfillment === "shipped" || fulfillment === "out_for_delivery") {
    return "Cancel is not available after dispatch. Mark the order delivered, then refund it outside this screen if the courier returns it.";
  }
  return null;
}

/** A paid confirmation is sent only after verification. Pending UPI and COD get a different letter, once. */
export type OrderLetter = "paid" | "cod" | "upi_pending";

export function letterFor(method: PaymentMethod, status: PaymentStatus): OrderLetter | null {
  if (status === "paid") return "paid";
  if (status === "pending" && method === "cod") return "cod";
  if (status === "pending" && method === "upi") return "upi_pending";
  return null;
}

export function upiIntent({ vpa, payee, amountPaise, orderCode }: { vpa: string; payee: string; amountPaise: number; orderCode: string }): string {
  const params = new URLSearchParams({
    pa: vpa,
    pn: payee,
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: orderCode,
  });
  return `upi://pay?${params.toString()}`;
}

export interface OrderEmailInput {
  code: string;
  createdAt: string;
  customerName: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  shippingPaise: number;
  discountPaise?: number;
  couponCode?: string;
  total: number;
  method: PaymentMethod;
  letter: OrderLetter;
  addressLines: string[];
  trackUrl: string;
  supportEmail: string;
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function orderEmail(input: OrderEmailInput): { subject: string; text: string } {
  const paymentLine =
    input.letter === "paid"
      ? "Payment: received."
      : input.letter === "cod"
        ? "Payment: cash on delivery. Please keep the amount ready. This is not a paid receipt."
        : "Payment: UPI verification is pending. We will not ship this order until we confirm the payment in our account. A UPI reference alone does not mark the order paid.";

  const lines = [
    `Hello ${input.customerName},`,
    "",
    input.letter === "paid" ? "Your Bitter Truth Coffee order is confirmed." : "We have received your Bitter Truth Coffee order.",
    "",
    `Order: ${input.code}`,
    `Date: ${input.createdAt}`,
    "",
    "Items",
    ...input.items.map((item) => `- ${item.name} × ${item.quantity} — ${rupees(item.unitPrice * item.quantity)}`),
    "",
    `Subtotal: ${rupees(input.subtotal)}`,
    `Shipping: ${rupees(input.shippingPaise)}`,
    ...((input.discountPaise ?? 0) > 0
      ? [`Discount${input.couponCode ? ` (${input.couponCode})` : ""}: -${rupees(input.discountPaise ?? 0)}`]
      : []),
    `Total: ${rupees(input.total)}`,
    `Method: ${input.method}`,
    paymentLine,
    "",
    "Ship to",
    ...input.addressLines,
    "",
    `Track ${input.code} with the phone number from checkout:`,
    input.trackUrl,
    `Questions: ${input.supportEmail}`,
  ];

  const subject =
    input.letter === "paid" ? `${input.code} — payment received` : input.letter === "cod" ? `${input.code} — pay on delivery` : `${input.code} — payment not yet verified`;

  return { subject, text: lines.join("\n") };
}
