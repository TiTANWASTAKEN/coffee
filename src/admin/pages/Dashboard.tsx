import { Link } from "react-router";
import type { AdminStats } from "@shared/store";
import { formatDate, formatPrice } from "@/lib/format";
import { useAdminQuery } from "../auth";
import { OrdersTable } from "../OrdersTable";
import { Alert, Card, Loading, PageTitle } from "../ui";

export default function Dashboard() {
  const { data: stats, error, loading } = useAdminQuery<AdminStats>("/stats");

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Sales, orders and stock at a glance." />
      {error && <Alert>{error}</Alert>}
      {loading && !stats && <Loading />}
      {stats && (
        <div className="flex flex-col gap-6">
          <WaitlistCard />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Verified revenue" value={formatPrice(stats.revenue)} hint="Paid orders, excluding cancelled" />
            <Stat label="Awaiting verification" value={stats.awaitingVerification} hint={formatPrice(stats.pendingValue) + " not collected"} to="/admin/orders?status=pending" />
            <Stat label="COD outstanding" value={formatPrice(stats.codOutstanding)} hint="Not collected until delivery" />
            <Stat label="Refunded" value={formatPrice(stats.refunded)} />
            <Stat label="To ship" value={stats.unfulfilledOrders} hint={`${stats.shippedOrders} shipped · ${stats.deliveredOrders} delivered`} to="/admin/orders?status=paid" />
            <Stat label="Paid orders" value={stats.paidOrders} />
            <Stat label="Cancelled or refunded" value={stats.cancelledOrders} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card
              title="Recent orders"
              className="lg:col-span-2"
              actions={
                <Link to="/admin/orders" className="text-body-sm text-muted hover:text-ivory">
                  View all
                </Link>
              }
            >
              <OrdersTable orders={stats.recentOrders} />
            </Card>

            <Card
              title={`Low stock (${stats.lowStock.length})`}
              actions={
                <Link to="/admin/products" className="text-body-sm text-muted hover:text-ivory">
                  {stats.products} products
                </Link>
              }
            >
              {stats.lowStock.length === 0 ? (
                <p className="text-body-sm text-muted">Everything is well stocked.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {stats.lowStock.map((p) => (
                    <li key={p.id}>
                      <Link to={`/admin/products/${p.id}`} className="flex items-center justify-between py-2.5 text-body-sm hover:text-ivory">
                        <span>{p.name}</span>
                        <span className={p.stock === 0 ? "text-danger" : "text-warning"}>{p.stock === 0 ? "Coming soon" : `${p.stock} left`}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function WaitlistCard() {
  const { data } = useAdminQuery<{ email: string; createdAt: string }[]>("/waitlist");
  const latest = data?.slice(0, 5) ?? [];
  return (
    <Card
      title={`Waitlist${data ? ` (${data.length})` : ""}`}
      actions={
        <Link to="/admin/waitlist" className="text-body-sm text-muted hover:text-ivory">
          View all
        </Link>
      }
    >
      {latest.length === 0 ? (
        <p className="text-body-sm text-muted">No emails yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {latest.map((entry) => (
            <li key={entry.email} className="flex items-center justify-between gap-4 py-2.5 text-body-sm">
              <span>{entry.email}</span>
              <span className="text-faint">{formatDate(entry.createdAt, false)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({ label, value, hint, to }: { label: string; value: string | number; hint?: string; to?: string }) {
  const body = (
    <>
      <p className="text-body-sm text-muted">{label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[0.8rem] text-faint">{hint}</p>}
    </>
  );
  const className = "block rounded-sm border border-line bg-surface p-5";
  return to ? (
    <Link to={to} className={`${className} transition-colors hover:border-line-strong`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
