import { letterFor, orderEmail, type OrderLetter } from "./commerce";
import { config } from "./config";
import { claimConfirmationEmail, db, getOrder } from "./db";
import { sendEmail } from "./email";

function messageFor(orderId: number, letter: OrderLetter) {
  const order = getOrder({ id: orderId });
  if (!order) return null;
  const built = orderEmail({
    code: order.code,
    createdAt: order.createdAt,
    customerName: order.customer.name,
    items: order.items.map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
    subtotal: order.subtotal,
    shippingPaise: order.shippingPaise,
    total: order.amount,
    method: order.paymentMethod,
    letter,
    addressLines: [order.customer.line1, order.customer.line2, `${order.customer.city}, ${order.customer.state} ${order.customer.postalCode}`].filter(Boolean),
    trackUrl: `${config.publicUrl}/track-order`,
    supportEmail: config.supportEmail,
  });
  return { order, built };
}

/** Sends the customer letter once. A second call (webhook retry) does nothing. */
export async function notifyOrderOnce(orderId: number): Promise<void> {
  const order = getOrder({ id: orderId });
  if (!order) return;
  const letter = letterFor(order.paymentMethod, order.status);
  if (!letter || !claimConfirmationEmail(order.id, letter)) return;
  const built = messageFor(order.id, letter);
  if (!built) return;
  const sent = await sendEmail({ to: built.order.customer.email, subject: built.built.subject, text: built.built.text });
  if (!sent) {
    db.prepare("UPDATE orders SET confirmation_sent = 0, confirmation_letter = '' WHERE id = ?").run(order.id);
    return;
  }
  if (config.adminNotifyEmail) {
    await sendEmail({ to: config.adminNotifyEmail, subject: `New order ${built.order.code}`, text: built.built.text });
  }
}

export async function resendOrderEmail(orderId: number): Promise<boolean> {
  const order = getOrder({ id: orderId });
  if (!order) return false;
  const letter = letterFor(order.paymentMethod, order.status);
  if (!letter) return false;
  const built = messageFor(order.id, letter);
  if (!built) return false;
  return sendEmail({ to: built.order.customer.email, subject: built.built.subject, text: built.built.text });
}
