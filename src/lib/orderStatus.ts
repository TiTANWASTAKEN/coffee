import type { OrderSummary } from "@shared/store";

/** One short, customer-friendly status for an order. */
export function orderStatusLabel(order: Pick<OrderSummary, "status" | "fulfillment">): string {
  if (order.status === "pending") return "Awaiting payment";
  if (order.status === "failed") return "Payment failed";
  switch (order.fulfillment) {
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

/** Index of the last completed tracking step, or -1 when the order isn't paid / was cancelled. */
export function trackingProgress(order: Pick<OrderSummary, "status" | "fulfillment">): number {
  if (order.status !== "paid" || order.fulfillment === "cancelled") return -1;
  return order.fulfillment === "delivered" ? 2 : order.fulfillment === "shipped" ? 1 : 0;
}
