import type { OrderSummary } from "@shared/store";
import { fulfillmentLabel } from "@shared/store";

/** One short, customer-friendly status for an order. */
export function orderStatusLabel(order: Pick<OrderSummary, "status" | "fulfillment" | "paymentMethod">): string {
  if (order.status === "refunded") return "Refunded";
  if (order.status === "failed") return "Payment failed";
  if (order.status === "pending" && order.paymentMethod === "cod") return "Pay on delivery";
  if (order.status === "pending" && order.paymentMethod === "upi") return "Awaiting payment verification";
  if (order.status === "pending") return "Awaiting payment";
  return fulfillmentLabel[order.fulfillment];
}

export const trackingSteps = [
  { key: "placed", label: "Order placed", detail: "Received." },
  { key: "packed", label: "Packed", detail: "Sealed and labelled." },
  { key: "shipped", label: "Shipped", detail: "Handed to the courier." },
  { key: "out", label: "On the way", detail: "Moving toward you." },
  { key: "delivered", label: "Delivered", detail: "At your door." },
] as const;

/** Index of the last completed tracking step, or -1 when there is nothing to track. */
export function trackingProgress(order: Pick<OrderSummary, "status" | "fulfillment">): number {
  if (order.status === "failed" || order.status === "refunded" || order.fulfillment === "cancelled") return -1;
  switch (order.fulfillment) {
    case "delivered":
      return 4;
    case "out_for_delivery":
      return 3;
    case "shipped":
      return 2;
    case "packed":
      return 1;
    default:
      return 0;
  }
}
