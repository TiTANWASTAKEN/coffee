import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { AdminOrder, PaymentStatus } from "@shared/store";
import { canClearUnpaidCheckout, defaultReminder } from "@shared/reminder";
import { errorMessage } from "@/lib/api";
import { useAdminAuth, useAdminQuery } from "../auth";
import { OrdersTable } from "../OrdersTable";
import { AdminButton, Alert, Card, FormField, inputClass, Loading, PageTitle } from "../ui";

interface ReminderSettings {
  subject: string;
  body: string;
  needsSetup: boolean;
}

const tabs: { label: string; value: PaymentStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Paid", value: "paid" },
  { label: "Awaiting payment", value: "pending" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

export default function Orders() {
  const { request } = useAdminAuth();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as PaymentStatus | "";
  const { data, error, loading, reload } = useAdminQuery<AdminOrder[]>(status ? `/orders?status=${status}` : "/orders");
  const reminder = useAdminQuery<ReminderSettings>("/settings/payment-reminder");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [subject, setSubject] = useState(defaultReminder.subject);
  const [messageBody, setMessageBody] = useState(defaultReminder.body);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    setSelected([]);
  }, [status]);

  useEffect(() => {
    if (!reminder.data) return;
    setSubject(reminder.data.subject);
    setMessageBody(reminder.data.body);
  }, [reminder.data]);

  const orders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      const day = o.createdAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [o.code, String(o.id), o.publicId, o.customer.name, o.customer.email, o.customer.phone, o.razorpayPaymentId ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [data, query, from, to]);

  const unpaid = orders.filter(canClearUnpaidCheckout);

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function saveReminder() {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await request<ReminderSettings>("/settings/payment-reminder", { method: "PUT", body: { subject, body: messageBody } });
      reminder.setData(saved);
      setNotice({ tone: "success", text: "Reminder message saved." });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function act(kind: "remind" | "delete-unpaid") {
    if (selected.length === 0) return;
    const noun = selected.length === 1 ? "checkout" : "checkouts";
    const question =
      kind === "delete-unpaid"
        ? `Delete ${selected.length} unpaid ${noun}? The bags go back into stock.`
        : `Send the reminder to ${selected.length} ${selected.length === 1 ? "customer" : "customers"}?`;
    if (!window.confirm(question)) return;
    setBusy(true);
    setNotice(null);
    try {
      const result = await request<{ sent?: number; failed?: number; deleted?: number; skipped?: number }>(`/orders/${kind}`, {
        method: "POST",
        body: { ids: selected },
      });
      if (kind === "remind") {
        const failed = result.failed ?? 0;
        setNotice({
          tone: failed ? "error" : "success",
          text: failed ? `Sent ${result.sent ?? 0}. ${failed} could not be sent.` : `Reminder sent to ${result.sent ?? 0}.`,
        });
      } else {
        setNotice({ tone: "success", text: `Deleted ${result.deleted ?? 0}.` });
      }
      setSelected([]);
      await reload();
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Orders"
        subtitle={data ? `${data.length} order${data.length === 1 ? "" : "s"}` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            {status === "pending" && (
              <>
                <AdminButton tone="secondary" disabled={busy || unpaid.length === 0} onClick={() => setSelected(unpaid.map((order) => order.id))}>
                  Select unpaid
                </AdminButton>
                <AdminButton disabled={busy || selected.length === 0} onClick={() => void act("remind")}>
                  Send reminder
                </AdminButton>
                <AdminButton tone="danger" disabled={busy || selected.length === 0} onClick={() => void act("delete-unpaid")}>
                  Delete
                </AdminButton>
              </>
            )}
            <AdminButton tone="secondary" disabled={!orders.length} onClick={() => downloadCsv(orders)}>
              Export CSV
            </AdminButton>
          </div>
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
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            aria-label="Search orders"
            placeholder="Search name, email, phone, order code…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} max-w-xs`}
          />
          <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
          <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      {status === "pending" && (
        <Card title="Reminder message" className="mb-5">
          {reminder.data?.needsSetup && (
            <Alert>Saving needs supabase/reminder.sql in the Supabase SQL editor. Until then, reminders use the wording already shown.</Alert>
          )}
          <div className="mt-4 flex flex-col gap-4">
            <FormField label="Subject">
              <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} className={inputClass} />
            </FormField>
            <FormField
              label="Message"
              hint="Filled in when you send: {name} {order} {items} {total} {shop}. This goes only to unpaid online checkouts. Cash on delivery and UPI orders stay."
            >
              <textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} maxLength={2000} rows={8} className={inputClass} />
            </FormField>
            <div>
              <AdminButton onClick={() => void saveReminder()} disabled={busy || reminder.loading}>
                {busy ? "Saving…" : "Save message"}
              </AdminButton>
            </div>
          </div>
        </Card>
      )}
      <Card>{loading && !data ? <Loading /> : <OrdersTable orders={orders} selected={selected} onToggle={status === "pending" ? toggle : undefined} />}</Card>
    </>
  );
}

function downloadCsv(orders: AdminOrder[]) {
  const header = ["Order", "Date (UTC)", "Payment method", "Status", "Fulfilment", "Total (INR)", "Name", "Email", "Phone", "Address", "City", "State", "PIN", "Items", "Razorpay payment"];
  const rows = orders.map((o) => [
    o.code,
    o.createdAt,
    o.paymentMethod,
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
