import type { OrderSummary } from "@shared/store";

/** One short, customer-friendly status for an order. */
export function orderStatusLabel(order: Pick<OrderSummary, "status" | "fulfillment" | "paymentMethod">): string {
  if (order.status === "refunded") return "Refunded";
  if (order.status === "failed") return "Payment failed";
  if (order.status === "pending" && order.paymentMethod === "cod") return "Pay on delivery";
  if (order.status === "pending" && order.paymentMethod === "upi") return "Awaiting payment verification";
  if (order.status === "pending") return "Awaiting payment";
  switch (order.fulfillment) {
    case "packed":
      return "Packed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return "Preparing to ship";
  }
}

export const trackingSteps = ["Order placed", "Shipped", "Delivered"] as const;

/** Index of the last completed tracking step, or -1 when there is nothing to track. */
export function trackingProgress(order: Pick<OrderSummary, "status" | "fulfillment">): number {
  if (order.status === "failed" || order.status === "refunded" || order.fulfillment === "cancelled") return -1;
  return order.fulfillment === "delivered" ? 2 : order.fulfillment === "shipped" ? 1 : 0;
}
