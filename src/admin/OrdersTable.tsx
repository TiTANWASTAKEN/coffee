import { Link, useNavigate } from "react-router";
import type { AdminOrder } from "@shared/store";
import { canClearUnpaidCheckout } from "@shared/reminder";
import { formatDate, formatPrice } from "@/lib/format";
import { Badge } from "./ui";

export function OrdersTable({
  orders,
  selected,
  onToggle,
}: {
  orders: AdminOrder[];
  selected?: number[];
  onToggle?: (id: number) => void;
}) {
  const navigate = useNavigate();
  if (orders.length === 0) return <p className="py-6 text-body-sm text-muted">No orders yet.</p>;

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[44rem] text-left text-body-sm">
        <thead className="text-[0.75rem] uppercase tracking-wider text-faint">
          <tr className="border-b border-line">
            {onToggle && <th className="w-10 px-5 py-2.5" />}
            <th className="px-5 py-2.5 font-medium">Order</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Customer</th>
            <th className="px-3 py-2.5 font-medium">Items</th>
            <th className="px-3 py-2.5 text-right font-medium">Total</th>
            <th className="px-3 py-2.5 font-medium">Payment</th>
            <th className="px-5 py-2.5 font-medium">Fulfilment</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              onClick={() => navigate(`/admin/orders/${o.id}`)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-raised"
            >
              {onToggle && (
                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                  {canClearUnpaidCheckout(o) && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${o.code}`}
                      checked={selected?.includes(o.id) ?? false}
                      onChange={() => onToggle(o.id)}
                    />
                  )}
                </td>
              )}
              <td className="px-5 py-3">
                <Link to={`/admin/orders/${o.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                  {o.code}
                </Link>
                <span className="block text-[0.75rem] uppercase tracking-wider text-faint">{o.paymentMethod}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-muted">{formatDate(o.createdAt)}</td>
              <td className="px-3 py-3">
                <span className="block">{o.customer.name}</span>
                <span className="block text-[0.8rem] text-faint">{o.customer.email}</span>
              </td>
              <td className="px-3 py-3 text-muted">{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
              <td className="px-3 py-3 text-right tabular-nums">{formatPrice(o.amount)}</td>
              <td className="px-3 py-3">
                <Badge value={o.status} />
              </td>
              <td className="px-5 py-3">{o.status === "paid" || o.paymentMethod === "cod" ? <Badge value={o.fulfillment} /> : <span className="text-faint">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
