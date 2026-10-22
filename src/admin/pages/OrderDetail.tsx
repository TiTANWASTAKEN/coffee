import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { fulfillmentLabel, nextFulfillments, type AdminOrder, type Fulfillment } from "@shared/store";
import { errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminAuth, useAdminQuery } from "../auth";
import { AdminButton, Alert, Badge, Card, FormField, inputClass, Loading, PageTitle } from "../ui";

export default function OrderDetail() {
  const { id } = useParams();
  const { request } = useAdminAuth();
  const { data: order, setData, error, loading } = useAdminQuery<AdminOrder>(`/orders/${id}`);
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [courier, setCourier] = useState("");
  const [trackingRef, setTrackingRef] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!order) return;
    setCourier(order.shipment?.courier ?? "");
    setTrackingRef(order.shipment?.trackingRef ?? "");
    setTrackingUrl(order.shipment?.trackingUrl ?? "");
    setLocation(order.shipment?.location ?? "");
  }, [order]);

  if (loading && !order) return <Loading />;
  if (error || !order) return <Alert>{error ?? "Order not found."}</Alert>;

  const selected = fulfillment ?? order.fulfillment;
  const c = order.customer;

  async function act(action: "verify-payment" | "refund" | "resend-email") {
    setSaving(true);
    setMessage(null);
    try {
      if (action === "resend-email") {
        await request(`/orders/${order!.id}/resend-email`, { method: "POST", body: {} });
        setMessage({ tone: "success", text: "Email sent." });
      } else {
        setData(await request<AdminOrder>(`/orders/${order!.id}/${action}`, { method: "POST", body: {} }));
        setMessage({ tone: "success", text: action === "refund" ? "Marked refunded." : "Payment verified." });
      }
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function saveShipment() {
    setSaving(true);
    setMessage(null);
    try {
      setData(await request<AdminOrder>(`/orders/${order!.id}`, { method: "PATCH", body: { shipment: { courier, trackingRef, trackingUrl, location, note } } }));
      setNote("");
      setMessage({ tone: "success", text: "Tracking saved." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      setData(await request<AdminOrder>(`/orders/${order!.id}`, { method: "PATCH", body: { fulfillment: selected } }));
      setFulfillment(null);
      setMessage({ tone: "success", text: "Fulfilment status updated." });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Link to="/admin/orders" className="mb-4 inline-flex items-center gap-2 text-body-sm text-muted hover:text-ivory">
        <ArrowLeft aria-hidden="true" className="size-4" /> Orders
      </Link>
      <PageTitle
        title={order.code}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Placed {formatDate(order.createdAt)} <Badge value={order.status} />
            {order.status === "paid" && <Badge value={order.fulfillment} />}
          </span>
        }
      />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Items">
            <table className="w-full text-body-sm">
              <tbody>
                {order.items.map((item, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="py-2.5">
                      {item.productId ? (
                        <Link to={`/admin/products/${item.productId}`} className="hover:underline">
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="py-2.5 text-muted">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong">
                  <td colSpan={2} className="pt-3 font-semibold">
                    Total
                  </td>
                  <td className="pt-3 text-right font-semibold tabular-nums">{formatPrice(order.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card title="Payment">
            <dl className="grid gap-4 text-body-sm sm:grid-cols-2">
              <Detail label="Method" value={order.paymentMethod} />
              <Detail label="Status" value={<Badge value={order.status} />} />
              <Detail label="Subtotal" value={formatPrice(order.subtotal)} />
              <Detail label="Shipping" value={formatPrice(order.shippingPaise)} />
              {order.discountPaise > 0 && <Detail label="Discount" value={`${order.couponCode ? `${order.couponCode} · ` : ""}−${formatPrice(order.discountPaise)}`} />}
              <Detail label="Paid at" value={formatDate(order.paidAt)} />
              <Detail label="UPI reference" value={order.upiReference || "—"} />
              <Detail label="Razorpay order" value={<code className="text-[0.8rem]">{order.razorpayOrderId ?? "—"}</code>} />
              <Detail label="Razorpay payment" value={<code className="text-[0.8rem]">{order.razorpayPaymentId ?? "—"}</code>} />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              {order.paymentMethod !== "razorpay" && order.status === "pending" && (
                <AdminButton
                  onClick={() => {
                    if (!window.confirm("Mark this payment as verified? This cannot be inferred from a customer reference alone.")) return;
                    void act("verify-payment");
                  }}
                >
                  Verify payment
                </AdminButton>
              )}
              {order.status === "paid" && order.fulfillment !== "shipped" && order.fulfillment !== "delivered" && (
                <AdminButton
                  tone="danger"
                  onClick={() => {
                    if (!window.confirm("Mark this order refunded and cancelled? You still need to return the money in Razorpay or by hand.")) return;
                    void act("refund");
                  }}
                >
                  Mark refunded
                </AdminButton>
              )}
              <AdminButton tone="secondary" onClick={() => void act("resend-email")}>
                Resend email
              </AdminButton>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Customer">
            <dl className="flex flex-col gap-4 text-body-sm">
              <Detail label="Name" value={c.name} />
              <Detail label="Checkout" value={order.customerId ? "Signed-in customer account" : "Guest checkout"} />
              <Detail label="Email" value={<a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>} />
              <Detail label="Phone" value={<a href={`tel:${c.phone}`} className="hover:underline">{c.phone}</a>} />
              <Detail
                label="Ship to"
                value={
                  <address className="not-italic leading-relaxed">
                    {c.line1}
                    {c.line2 && (
                      <>
                        <br />
                        {c.line2}
                      </>
                    )}
                    <br />
                    {c.city}, {c.state} {c.postalCode}
                  </address>
                }
              />
            </dl>
          </Card>

          <Card title="Fulfilment">
            {order.status !== "paid" && order.paymentMethod !== "cod" ? (
              <p className="text-body-sm text-muted">Verify the payment before packing or shipping.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <select value={selected} onChange={(e) => setFulfillment(e.target.value as Fulfillment)} className={inputClass}>
                  {[order.fulfillment, ...nextFulfillments(order.fulfillment)].map((s) => (
                    <option key={s} value={s}>
                      {fulfillmentLabel[s]}
                    </option>
                  ))}
                </select>
                <AdminButton onClick={() => void save()} disabled={saving || selected === order.fulfillment}>
                  {saving ? "Saving…" : "Update status"}
                </AdminButton>
                <FormField label="Where it has reached">
                  <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} placeholder="Bengaluru hub" />
                </FormField>
                <FormField label="Note for the customer">
                  <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="Left the roastery this morning" />
                </FormField>
                <FormField label="Courier">
                  <input value={courier} onChange={(e) => setCourier(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Tracking reference">
                  <input value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} className={inputClass} />
                </FormField>
                <FormField label="Tracking URL">
                  <input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} className={inputClass} placeholder="https://" />
                </FormField>
                <AdminButton tone="secondary" onClick={() => void saveShipment()} disabled={saving}>
                  Save tracking
                </AdminButton>
                {order.updates.some((update) => update.note) && (
                  <ul className="mt-2 border-t border-line pt-3 text-body-sm text-muted">
                    {order.updates
                      .filter((update) => update.note)
                      .map((update, i) => (
                        <li key={`${update.at}-${i}`} className="py-1.5">
                          <span className="text-faint">{update.label}</span> — {update.note}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[0.75rem] uppercase tracking-wider text-faint">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
