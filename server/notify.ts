import { letterFor, type OrderLetter } from "./commerce";
import { claimConfirmationEmail, db, getOrder } from "./db";
import { deliverOrderMail, type OrderMail } from "./orderMail";

function mailFor(orderId: number, letter: OrderLetter): OrderMail | null {
  const order = getOrder({ id: orderId });
  if (!order) return null;
  return {
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
  };
}

/** Sends the customer letter once, and a copy to the shop. A second call (webhook retry) does nothing. */
export async function notifyOrderOnce(orderId: number): Promise<void> {
  const order = getOrder({ id: orderId });
  if (!order) return;
  const letter = letterFor(order.paymentMethod, order.status);
  if (!letter || !claimConfirmationEmail(order.id, letter)) return;
  const mail = mailFor(order.id, letter);
  if (!mail) return;
  const sent = await deliverOrderMail(mail);
  if (!sent) db.prepare("UPDATE orders SET confirmation_sent = 0, confirmation_letter = '' WHERE id = ?").run(order.id);
}

export async function resendOrderEmail(orderId: number): Promise<boolean> {
  const order = getOrder({ id: orderId });
  if (!order) return false;
  const letter = letterFor(order.paymentMethod, order.status);
  if (!letter) return false;
  const mail = mailFor(order.id, letter);
  if (!mail) return false;
  return deliverOrderMail(mail);
}
