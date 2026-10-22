import type { PaymentMethod } from "../shared/store";
import { orderEmail, type OrderLetter } from "./commerce";
import { config } from "./config";
import { sendEmail } from "./email";

export interface OrderMail {
  code: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  shippingPaise: number;
  discountPaise?: number;
  couponCode?: string;
  total: number;
  method: PaymentMethod;
  letter: OrderLetter;
  addressLines: string[];
}

/** The shop owner, plus any extra notify address. The customer's own address is never copied here. */
export function adminMailRecipients(customerEmail: string): string[] {
  const skip = customerEmail.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [config.admin.email, config.adminNotifyEmail]) {
    const email = value.trim().toLowerCase();
    if (!email || email === skip || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

/** Customer confirmation, then the same letter to the shop. Returns false only when the customer send is rejected. */
export async function deliverOrderMail(order: OrderMail): Promise<boolean> {
  const built = orderEmail({
    code: order.code,
    createdAt: order.createdAt,
    customerName: order.customerName,
    items: order.items,
    subtotal: order.subtotal,
    shippingPaise: order.shippingPaise,
    discountPaise: order.discountPaise,
    couponCode: order.couponCode,
    total: order.total,
    method: order.method,
    letter: order.letter,
    addressLines: order.addressLines,
    trackUrl: `${config.publicUrl}/track-order?code=${encodeURIComponent(order.code)}`,
    supportEmail: config.supportEmail,
  });
  const sent = await sendEmail({ to: order.customerEmail, subject: built.subject, text: built.text });
  if (!sent) return false;
  for (const to of adminMailRecipients(order.customerEmail)) {
    await sendEmail({ to, subject: `New order ${order.code}`, text: built.text });
  }
  return true;
}
