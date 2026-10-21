import type { OrderSummary, TrackingUpdate } from "@shared/store";
import { trackingProgress, trackingSteps } from "@/lib/orderStatus";

type Tracked = Pick<OrderSummary, "status" | "fulfillment"> & {
  shipment?: { location?: string; courier?: string } | null;
  updates?: TrackingUpdate[];
};

/** Vertical journey. The current step carries where the parcel has reached. */
export function OrderTracker({ order }: { order: Tracked }) {
  const done = trackingProgress(order);
  if (done < 0) return null;
  const location = order.shipment?.location?.trim() ?? "";
  const notes = (order.updates ?? []).filter((update) => update.note.trim());

  return (
    <div>
      <ol aria-label="Order progress" className="flex flex-col">
        {trackingSteps.map((step, i) => {
          const reached = i <= done;
          const current = i === done;
          const line = i < trackingSteps.length - 1;
          const here = current && location ? location : current ? step.detail : "";
          return (
            <li key={step.key} aria-current={current ? "step" : undefined} className="grid grid-cols-[1.25rem_1fr] gap-x-5">
              <span className="flex flex-col items-center">
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                    current ? "bg-ivory ring-4 ring-ivory/15" : reached ? "bg-accent" : "border border-line-strong bg-transparent"
                  }`}
                />
                {line && <span className={`my-1 w-px flex-1 ${i < done ? "bg-accent/80" : "bg-line"}`} />}
              </span>
              <span className={`pb-7 ${line ? "" : "pb-0"}`}>
                <span className={`block text-body-sm ${reached ? "text-ivory" : "text-faint"}`}>{step.label}</span>
                {here && <span className={`mt-1 block text-body-sm ${current ? "text-muted" : "text-faint"}`}>{here}</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {notes.length > 0 && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="eyebrow text-faint">Trail</p>
          <ul className="mt-4 flex flex-col gap-3">
            {notes.map((update, i) => (
              <li key={`${update.at}-${i}`} className="grid grid-cols-[5.5rem_1fr] gap-4 text-body-sm">
                <span className="text-faint">{update.label}</span>
                <span className="text-muted">{update.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
