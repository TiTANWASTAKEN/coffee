import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router";
import type { OrderSummary } from "@shared/store";
import { OrderTracker } from "@/components/account/OrderTracker";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, ApiError, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { orderStatusLabel, trackingProgress } from "@/lib/orderStatus";
import { useAccount } from "@/store/account";
import NotFound from "./NotFound";

export default function OrderConfirmation() {
  useDocumentTitle("Order confirmed");
  const { id } = useParams();
  const { customer } = useAccount();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const load = async (attempt: number) => {
      try {
        const data = await api<OrderSummary>(`/orders/${encodeURIComponent(id ?? "")}`);
        if (cancelled) return;
        setOrder(data);
        // A webhook may still be confirming the payment — check again briefly.
        if (data.status === "pending" && attempt < 5) timer = window.setTimeout(() => void load(attempt + 1), 3000);
      } catch (err) {
        if (!cancelled) setError(err);
      }
    };
    void load(0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  if (error instanceof ApiError && error.status === 404) return <NotFound />;

  return (
    <PageTransition>
      <section className="container-site pb-section pt-[calc(var(--spacing-nav)_+_4rem)]">
        {error ? (
          <p className="text-muted">{errorMessage(error)}</p>
        ) : !order ? (
          <p className="text-muted">Loading your order…</p>
        ) : (
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <p className="eyebrow flex items-center gap-4 text-muted">
                <span aria-hidden="true" className="h-px w-8 bg-accent" />
                {order.status === "paid" ? "Order confirmed" : order.status === "failed" ? "Payment failed" : "Payment processing"}
              </p>
              <h1 className="mt-6 text-display-lg font-light uppercase">
                {order.status === "paid" ? `Thank you, ${order.customerName.split(" ")[0]}.` : order.status === "failed" ? "Something went wrong." : "Hang tight."}
              </h1>
              <p className="mt-8 max-w-md text-lead text-muted">
                {order.status === "paid"
                  ? `We’ve received your order and will email ${order.email} when it ships.`
                  : order.status === "failed"
                    ? "Your payment didn’t go through and you haven’t been charged. Your cart is still saved."
                    : order.paymentMethod === "cod"
                      ? "Your order is placed. Payment is due when it is delivered."
                      : order.paymentMethod === "upi"
                        ? "Your order is placed, but it is not paid yet. We will not ship it until the payment is verified."
                        : "We’re waiting for the bank to confirm your payment. This page will update automatically."}
              </p>
              {order.status === "paid" && !customer && (
                <p className="mt-6 max-w-md text-body-sm text-faint">Bookmark this page — it’s where you can track your order.</p>
              )}
              {order.status === "pending" && order.paymentMethod === "upi" && <UpiReference publicId={order.id} />}
              <div className="mt-10 flex flex-wrap gap-4">
                {customer && (
                  <ButtonLink to="/account">
                    Your orders
                  </ButtonLink>
                )}
                <ButtonLink to="/shop" variant="outline">
                  Continue shopping
                </ButtonLink>
              </div>
            </div>

            <div className="border border-line bg-surface p-6 lg:col-span-5 lg:col-start-8">
              <dl className="grid grid-cols-3 gap-4 text-body-sm">
                <div>
                  <dt className="eyebrow text-faint">Order</dt>
                  <dd className="mt-1 tabular-nums text-ivory">{order.code}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-faint">Placed</dt>
                  <dd className="mt-1 text-muted">{formatDate(order.createdAt)}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-faint">Status</dt>
                  <dd className="mt-1 text-muted">{orderStatusLabel(order)}</dd>
                </div>
              </dl>
              {trackingProgress(order) >= 0 && (
                <div className="mt-6 border-t border-line pt-6">
                  <OrderTracker order={order} />
                </div>
              )}
              <ul className="mt-6 border-t border-line">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-4 border-b border-line py-4">
                    <span>
                      {item.name} <span className="text-muted">× {item.quantity}</span>
                    </span>
                    <span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex items-baseline justify-between">
                <span className="eyebrow text-muted">{order.status === "paid" ? "Total paid" : "Total"}</span>
                <span className="font-display text-display-xs tabular-nums">{formatPrice(order.amount)}</span>
              </p>
              {order.shipment?.trackingUrl && (
                <p className="mt-4 text-body-sm">
                  <a href={order.shipment.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                    Track shipment{order.shipment.courier ? ` · ${order.shipment.courier}` : ""}
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </PageTransition>
  );
}

function UpiReference({ publicId }: { publicId: string }) {
  const [reference, setReference] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/orders/" + encodeURIComponent(publicId) + "/upi-reference", { method: "POST", body: { reference } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-md border border-line p-5">
      <p className="text-body-sm text-muted">If you have paid, you can leave the UPI reference here. This does not mark the order paid.</p>
      <Field label="UPI reference" value={reference} onChange={setReference} required className="mt-5" />
      {error && <p className="mt-3 text-body-sm text-ivory">{error}</p>}
      <Button type="submit" size="sm" className="mt-5" disabled={sent}>
        {sent ? "Reference saved" : "Submit reference"}
      </Button>
    </form>
  );
}
