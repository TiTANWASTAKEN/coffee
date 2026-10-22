import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
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
  const [params] = useSearchParams();
  const [orderCode, setOrderCode] = useState(params.get("code") ?? "");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(code: string, contact: string) {
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      setOrder(await api<TrackedOrder>("/track", { method: "POST", body: { orderCode: code, phone: contact } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void lookup(orderCode, phone);
  }

  return (
    <PageTransition>
      <section className="container-site pb-section pt-[calc(var(--spacing-nav)_+_4rem)]">
        <p className="eyebrow flex items-center gap-4 text-muted">
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          Tracking
        </p>
        <h1 className="mt-6 max-w-3xl text-display-md font-light uppercase">Where is your coffee.</h1>
        <p className="mt-6 max-w-md text-muted">Enter the order number and the phone number from checkout. Both have to match.</p>

        <form onSubmit={onSubmit} className="mt-12 grid max-w-3xl gap-8 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Order number" value={orderCode} onChange={setOrderCode} autoComplete="off" required placeholder="BT-0012" />
          <Field label="Phone" type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={setPhone} required placeholder="98765 43210" />
          <Button type="submit" disabled={busy} className="sm:mb-px">
            {busy ? "Looking…" : "Track"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="mt-8 max-w-xl border border-coffee-light/60 bg-coffee/20 px-4 py-3 text-body-sm text-ivory">
            {error}
          </p>
        )}

        {order && (
          <div className="mt-20 grid gap-16 border-t border-line pt-16 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="eyebrow text-faint">Order</p>
              <p className="mt-3 font-display text-display-sm font-light tabular-nums text-ivory">{order.code}</p>
              <dl className="mt-8 grid grid-cols-2 gap-6 text-body-sm">
                <div>
                  <dt className="eyebrow text-faint">Placed</dt>
                  <dd className="mt-2 text-muted">{formatDate(order.createdAt)}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-faint">Status</dt>
                  <dd className="mt-2 text-ivory">{orderStatusLabel(order)}</dd>
                </div>
              </dl>
              {order.shipment?.courier && (
                <p className="mt-8 text-body-sm text-muted">
                  Courier <span className="text-ivory">{order.shipment.courier}</span>
                  {order.shipment.trackingUrl && (
                    <>
                      {" · "}
                      <a href={order.shipment.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                        Courier tracking
                      </a>
                    </>
                  )}
                </p>
              )}
              {order.status === "pending" && order.paymentMethod === "upi" && (
                <p className="mt-6 max-w-sm text-body-sm text-muted">Payment is not verified yet. This order will not ship until it shows in our account.</p>
              )}
              {order.status === "pending" && order.paymentMethod === "cod" && (
                <p className="mt-6 max-w-sm text-body-sm text-muted">Payment is due when the order is delivered.</p>
              )}
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              {trackingProgress(order) >= 0 && <OrderTracker order={order} />}
              <ul className="mt-12 border-t border-line">
                {order.items.map((item) => (
                  <li key={`${item.name}-${item.quantity}`} className="flex justify-between gap-4 border-b border-line py-4 text-body-sm">
                    <span>
                      {item.name} <span className="text-muted">× {item.quantity}</span>
                    </span>
                    <span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              {order.discountPaise > 0 && (
                <p className="mt-4 flex justify-between text-body-sm text-muted">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span className="tabular-nums">−{formatPrice(order.discountPaise)}</span>
                </p>
              )}
              <p className="mt-5 flex items-baseline justify-between">
                <span className="eyebrow text-muted">Total</span>
                <span className="font-display text-display-xs tabular-nums">{formatPrice(order.amount)}</span>
              </p>
            </div>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
