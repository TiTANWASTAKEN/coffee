import { useState, type FormEvent } from "react";
import type { TrackedOrder } from "@shared/store";
import { OrderTracker } from "@/components/account/OrderTracker";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { orderStatusLabel, trackingProgress } from "@/lib/orderStatus";

export default function TrackOrder() {
  useDocumentTitle("Track your order");
  const [orderCode, setOrderCode] = useState("");
  const [contact, setContact] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      setOrder(await api<TrackedOrder>("/track", { method: "POST", body: { orderCode, contact } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <section className="container-site pb-section pt-[calc(var(--spacing-nav)_+_4rem)]">
        <p className="eyebrow flex items-center gap-4 text-muted">
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          Orders
        </p>
        <h1 className="mt-6 text-display-md font-light uppercase">Track your order.</h1>
        <p className="mt-6 max-w-lg text-muted">Use the order number from your confirmation and the email or phone you checked out with.</p>

        <form onSubmit={onSubmit} className="mt-12 grid max-w-xl gap-8">
          <Field label="Order number" value={orderCode} onChange={setOrderCode} autoComplete="off" required placeholder="BT-0012" />
          <Field label="Email or phone" value={contact} onChange={setContact} autoComplete="email" required />
          {error && (
            <p role="alert" className="border border-coffee-light/60 bg-coffee/20 px-4 py-3 text-body-sm text-ivory">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Looking up…" : "Track order"}
          </Button>
        </form>

        {order && (
          <div className="mt-16 max-w-xl border border-line bg-surface p-6">
            <dl className="grid grid-cols-2 gap-4 text-body-sm">
              <div>
                <dt className="eyebrow text-faint">Order</dt>
                <dd className="mt-1 text-ivory">{order.code}</dd>
              </div>
              <div>
                <dt className="eyebrow text-faint">Placed</dt>
                <dd className="mt-1 text-muted">{formatDate(order.createdAt)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="eyebrow text-faint">Status</dt>
                <dd className="mt-1 text-ivory">{orderStatusLabel(order)}</dd>
              </div>
            </dl>
            {trackingProgress(order) >= 0 && (
              <div className="mt-6 border-t border-line pt-6">
                <OrderTracker order={order} />
              </div>
            )}
            <ul className="mt-6 border-t border-line">
              {order.items.map((item) => (
                <li key={`${item.name}-${item.quantity}`} className="flex justify-between gap-4 border-b border-line py-4">
                  <span>
                    {item.name} <span className="text-muted">× {item.quantity}</span>
                  </span>
                  <span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 flex flex-col gap-2 text-body-sm text-muted">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{formatPrice(order.shippingPaise)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-3 text-ivory">
                <dt className="eyebrow">Total</dt>
                <dd className="font-display text-display-xs tabular-nums">{formatPrice(order.amount)}</dd>
              </div>
            </dl>
            {order.status === "pending" && order.paymentMethod === "upi" && (
              <p className="mt-5 text-body-sm text-muted">Payment is not verified yet. We will not ship this order until the payment shows in our account.</p>
            )}
            {order.status === "pending" && order.paymentMethod === "cod" && (
              <p className="mt-5 text-body-sm text-muted">Payment is due when the order is delivered.</p>
            )}
            {order.shipment?.trackingUrl && (
              <p className="mt-5 text-body-sm">
                <a href={order.shipment.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                  Track with {order.shipment.courier || "the courier"}
                </a>
              </p>
            )}
          </div>
        )}
      </section>
    </PageTransition>
  );
}
