import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { AdminOrder, PaymentStatus } from "@shared/store";
import { useAdminQuery } from "../auth";
import { OrdersTable } from "../OrdersTable";
import { AdminButton, Alert, Card, inputClass, Loading, PageTitle } from "../ui";

const tabs: { label: string; value: PaymentStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Paid", value: "paid" },
  { label: "Awaiting payment", value: "pending" },
  { label: "Failed", value: "failed" },
];

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as PaymentStatus | "";
  const { data, error, loading } = useAdminQuery<AdminOrder[]>(status ? `/orders?status=${status}` : "/orders");
  const [query, setQuery] = useState("");

  const orders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || !q) return data ?? [];
    return data.filter((o) =>
      [String(o.id), o.publicId, o.customer.name, o.customer.email, o.customer.phone, o.razorpayPaymentId ?? ""].some((v) => v.toLowerCase().includes(q)),
    );
  }, [data, query]);

  return (
    <>
      <PageTitle
        title="Orders"
        subtitle={data ? `${data.length} order${data.length === 1 ? "" : "s"}` : undefined}
        actions={
          <AdminButton tone="secondary" disabled={!orders.length} onClick={() => downloadCsv(orders)}>
            Export CSV
          </AdminButton>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div role="tablist" className="flex flex-wrap gap-1 rounded-sm border border-line p-1">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              type="button"
              aria-selected={status === t.value}
              onClick={() => setParams(t.value ? { status: t.value } : {})}
              className="rounded-sm px-3 py-1.5 text-body-sm text-muted transition-colors hover:text-ivory aria-selected:bg-surface-raised aria-selected:text-ivory"
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search name, email, phone, order #…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
      </div>

      {error && <Alert>{error}</Alert>}
      <Card>{loading && !data ? <Loading /> : <OrdersTable orders={orders} />}</Card>
    </>
  );
}

function downloadCsv(orders: AdminOrder[]) {
  const header = ["Order", "Date (UTC)", "Status", "Fulfilment", "Total (INR)", "Name", "Email", "Phone", "Address", "City", "State", "PIN", "Items", "Razorpay payment"];
  const rows = orders.map((o) => [
    o.id,
    o.createdAt,
    o.status,
    o.fulfillment,
    (o.amount / 100).toFixed(2),
    o.customer.name,
    o.customer.email,
    o.customer.phone,
    [o.customer.line1, o.customer.line2].filter(Boolean).join(", "),
    o.customer.city,
    o.customer.state,
    o.customer.postalCode,
    o.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
    o.razorpayPaymentId ?? "",
  ]);
  const escape = (v: string | number) => {
    const s = String(v);
    // Leading =,+,-,@ would be treated as formulas by spreadsheet apps.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
