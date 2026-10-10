import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { FULFILLMENT_STATES, type AdminOrder, type Fulfillment } from "@shared/store";
import { errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminAuth, useAdminQuery } from "../auth";
import { AdminButton, Alert, Badge, Card, inputClass, Loading, PageTitle } from "../ui";

export default function OrderDetail() {
  const { id } = useParams();
  const { request } = useAdminAuth();
  const { data: order, setData, error, loading } = useAdminQuery<AdminOrder>(`/orders/${id}`);
  const [fulfillment, setFulfillment] = useState<Fulfillment | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  if (loading && !order) return <Loading />;
  if (error || !order) return <Alert>{error ?? "Order not found."}</Alert>;

  const selected = fulfillment ?? order.fulfillment;
  const c = order.customer;

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
        title={`Order #${order.id}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            Placed {formatDate(order.createdAt)} <Badge value={order.status} />
            {order.status === "paid" && <Badge value={order.fulfillment} />}
          </span>
        }
      />

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
              <Detail label="Status" value={<Badge value={order.status} />} />
              <Detail label="Paid at" value={formatDate(order.paidAt)} />
              <Detail label="Razorpay order" value={<code className="text-[0.8rem]">{order.razorpayOrderId ?? "—"}</code>} />
              <Detail label="Razorpay payment" value={<code className="text-[0.8rem]">{order.razorpayPaymentId ?? "—"}</code>} />
            </dl>
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
            {order.status !== "paid" ? (
              <p className="text-body-sm text-muted">Available once the order is paid.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <select value={selected} onChange={(e) => setFulfillment(e.target.value as Fulfillment)} className={`${inputClass} capitalize`}>
                  {FULFILLMENT_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <AdminButton onClick={() => void save()} disabled={saving || selected === order.fulfillment}>
                  {saving ? "Saving…" : "Update status"}
                </AdminButton>
                {message && <Alert tone={message.tone}>{message.text}</Alert>}
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
