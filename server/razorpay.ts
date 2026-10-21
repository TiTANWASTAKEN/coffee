import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";
import { HttpError } from "./http";

const { keyId, keySecret, webhookSecret } = config.razorpay;

export const razorpayConfigured = Boolean(keyId && keySecret);

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

/** https://razorpay.com/docs/api/orders/create/ */
export async function createRazorpayOrder(amount: number, receipt: string): Promise<RazorpayOrder> {
  if (!razorpayConfigured) throw new HttpError(503, "Payments are not set up yet. Add your Razorpay keys to .env.");
  if (!Number.isInteger(amount) || amount < 100) throw new HttpError(400, "Amount must be at least ₹1.");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount, currency: "INR", receipt }),
  });

  if (!res.ok) {
    console.error("Razorpay order creation failed:", res.status, await res.text());
    if (res.status === 401) throw new HttpError(401, "Payment service rejected the API keys.");
    throw new HttpError(500, "Could not start the payment. Please try again.");
  }
  return (await res.json()) as RazorpayOrder;
}

function safeEqualHex(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signature returned to the browser by Checkout after a successful payment. */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

export const webhookConfigured = Boolean(webhookSecret);

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export const razorpayKeyId = keyId;
