/** Unpaid Razorpay checkouts. Cash on delivery and UPI are real orders, so they stay. */
export function canClearUnpaidCheckout(order: { status: string; paymentMethod: string; razorpayPaymentId?: string | null }): boolean {
  return order.status === "pending" && order.paymentMethod === "razorpay" && !order.razorpayPaymentId;
}

export const defaultReminder = {
  subject: "Your Bitter Truth order {order} is waiting for payment",
  body: `Hello {name},

You started order {order} and the payment was not finished.

{items}

Total {total}

Those bags are still set aside. Come back to the shop to complete the order:
{shop}

Bitter Truth Coffee`,
};

const TOKEN = /\{(name|order|items|total|shop)\}/g;

export function renderReminder(template: string, fields: { name: string; order: string; items: string; total: string; shop: string }): string {
  return template.replace(TOKEN, (_, key: keyof typeof fields) => fields[key]);
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? String(rupees) : rupees.toFixed(2)}`;
}
