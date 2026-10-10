import type { OrderSummary } from "@shared/store";
import { trackingProgress, trackingSteps } from "@/lib/orderStatus";

/** Placed → Shipped → Delivered progress bar. Renders nothing for unpaid or cancelled orders. */
export function OrderTracker({ order }: { order: Pick<OrderSummary, "status" | "fulfillment"> }) {
  const done = trackingProgress(order);
  if (done < 0) return null;

  return (
    <ol aria-label="Order progress" className="grid grid-cols-3">
      {trackingSteps.map((step, i) => (
        <li key={step} aria-current={i === done ? "step" : undefined} className="flex flex-col gap-3">
          <span className="flex items-center">
            <span className={`size-2.5 shrink-0 rounded-full ${i <= done ? "bg-accent" : "border border-line-strong"}`} />
            {i < trackingSteps.length - 1 && <span className={`h-px flex-1 ${i < done ? "bg-accent" : "bg-line-strong"}`} />}
          </span>
          <span className={`label font-medium ${i <= done ? "text-ivory" : "text-faint"}`}>{step}</span>
        </li>
      ))}
    </ol>
  );
}
