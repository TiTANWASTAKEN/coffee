import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import type { CustomerAccount, OrderSummary, SavedAddress } from "@shared/store";
import { PageTransition } from "@/components/layout/PageTransition";
import { AddressForm, AddressLines } from "@/components/account/AddressForm";
import { OrderTracker } from "@/components/account/OrderTracker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/format";
import { orderStatusLabel } from "@/lib/orderStatus";
import { useAccount } from "@/store/account";

const tabs = [
  { id: "orders", label: "Orders" },
  { id: "addresses", label: "Addresses" },
  { id: "profile", label: "Profile" },
] as const;

type Tab = (typeof tabs)[number]["id"];

export default function Account() {
  useDocumentTitle("Your account");
  const { loading, customer, logout } = useAccount();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = tabs.some((t) => t.id === params.get("tab")) ? (params.get("tab") as Tab) : "orders";

  if (loading) return <div className="min-h-[100svh]" />;
  if (!customer) return <Navigate to="/account/login?next=/account" replace />;

  return (
    <PageTransition>
      <section className="container-site pb-section pt-[calc(var(--spacing-nav)_+_3rem)]">
        <p className="eyebrow flex items-center gap-4 text-muted">
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          Your account
        </p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <h1 className="text-display-md font-light uppercase">Hello, {customer.name.split(" ")[0]}.</h1>
          <button
            type="button"
            onClick={() => void logout().then(() => navigate("/", { replace: true }))}
            className="label text-muted underline transition-colors hover:text-ivory"
          >
            Sign out
          </button>
        </div>

        <div role="tablist" aria-label="Account sections" className="mt-12 flex gap-8 border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setParams(t.id === "orders" ? {} : { tab: t.id }, { replace: true })}
              className="label -mb-px border-b py-4 transition-colors aria-selected:border-ivory aria-selected:text-ivory border-transparent text-muted hover:text-ivory"
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" className="mt-10">
          {tab === "orders" && <Orders />}
          {tab === "addresses" && <Addresses />}
          {tab === "profile" && <Profile customer={customer} />}
        </div>
      </section>
    </PageTransition>
  );
}

// ---------- Orders ----------

function Orders() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<OrderSummary[]>("/account/orders")
      .then(setOrders)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <FormError>{error}</FormError>;
  if (!orders) return <p className="text-muted">Loading your orders…</p>;
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-8">
        <p className="text-muted">You haven’t placed any orders yet.</p>
        <ButtonLink to="/shop" variant="outline">
          Browse the shop
        </ButtonLink>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-5">
      {orders.map((order) => (
        <li key={order.id} className="border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="font-display text-display-xs">Order #{order.number}</p>
              <p className="mt-1 text-body-sm text-muted">Placed {formatDate(order.createdAt, false)}</p>
            </div>
            <p className="label font-medium text-accent">{orderStatusLabel(order)}</p>
          </div>
          <p className="mt-5 text-body-sm text-muted">
            {order.items.map((i) => `${i.name} × ${i.quantity}`).join(" · ")}
          </p>
          <div className="mt-6 max-w-md">
            <OrderTracker order={order} />
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <span className="tabular-nums">{formatPrice(order.amount)}</span>
            <Link to={`/order/${order.id}`} className="label text-muted underline hover:text-ivory">
              View order
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------- Addresses ----------

function Addresses() {
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<SavedAddress[]>("/account/addresses")
      .then(setAddresses)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(load, [load]);

  async function act(fn: () => Promise<SavedAddress[] | unknown>) {
    setError(null);
    try {
      const result = await fn();
      if (Array.isArray(result)) setAddresses(result as SavedAddress[]);
      else load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!addresses) return error ? <FormError>{error}</FormError> : <p className="text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <FormError>{error}</FormError>

      {editing === "new" ? (
        <AddressForm
          onCancel={() => setEditing(null)}
          onSave={async (address) => {
            await api("/account/addresses", { method: "POST", body: address });
            setEditing(null);
            load();
          }}
        />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setEditing("new")}>
          Add an address
        </Button>
      )}

      {addresses.length === 0 && editing !== "new" && <p className="text-muted">No saved addresses yet. Addresses you use at checkout can be saved here too.</p>}

      <ul className="grid gap-5 md:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="md:col-span-2">
              <AddressForm
                initial={a}
                onCancel={() => setEditing(null)}
                onSave={async (address) => {
                  await api(`/account/addresses/${a.id}`, { method: "PATCH", body: address });
                  setEditing(null);
                  load();
                }}
              />
            </li>
          ) : (
            <li key={a.id} className="flex flex-col border border-line bg-surface p-6">
              {a.isDefault && <p className="eyebrow mb-4 text-accent">Default</p>}
              <AddressLines address={a} />
              <div className="mt-6 flex flex-wrap gap-5 border-t border-line pt-4">
                <button type="button" onClick={() => setEditing(a.id)} className="label text-muted underline hover:text-ivory">
                  Edit
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => void act(() => api(`/account/addresses/${a.id}/default`, { method: "POST" }))}
                    className="label text-muted underline hover:text-ivory"
                  >
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => window.confirm("Delete this address?") && void act(() => api(`/account/addresses/${a.id}`, { method: "DELETE" }))}
                  className="label text-muted underline hover:text-ivory"
                >
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

// ---------- Profile ----------

function Profile({ customer }: { customer: CustomerAccount }) {
  const { setCustomer } = useAccount();
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<"profile" | "password" | null>(null);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy("profile");
    setProfileMsg(null);
    try {
      setCustomer(await api<CustomerAccount>("/account/me", { method: "PATCH", body: { name, phone } }));
      setProfileMsg({ ok: true, text: "Saved." });
    } catch (err) {
      setProfileMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setBusy("password");
    setPasswordMsg(null);
    try {
      await api("/account/password", { method: "POST", body: { currentPassword: current, newPassword: next } });
      setCurrent("");
      setNext("");
      setPasswordMsg({ ok: true, text: "Password changed. You’ve been signed out on other devices." });
    } catch (err) {
      setPasswordMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  const message = (m: { ok: boolean; text: string } | null) =>
    m && (m.ok ? <p role="status" className="text-body-sm text-accent">{m.text}</p> : <FormError>{m.text}</FormError>);

  return (
    <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
      <form onSubmit={saveProfile} className="flex flex-col gap-7">
        <h2 className="font-display text-display-xs font-light">Your details</h2>
        <div className="flex flex-col gap-2">
          <span className="eyebrow text-muted">Email</span>
          <p className="min-h-12 border-b border-line py-3 text-muted">{customer.email}</p>
        </div>
        <Field label="Full name" autoComplete="name" required maxLength={120} value={name} onChange={setName} />
        <Field label="Phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={setPhone} />
        {message(profileMsg)}
        <Button type="submit" size="sm" className="w-fit" disabled={busy !== null}>
          {busy === "profile" ? "Saving…" : "Save details"}
        </Button>
      </form>

      <form onSubmit={changePassword} className="flex flex-col gap-7">
        <h2 className="font-display text-display-xs font-light">Change password</h2>
        <Field label="Current password" type="password" autoComplete="current-password" required value={current} onChange={setCurrent} />
        <Field label="New password" type="password" autoComplete="new-password" required minLength={8} value={next} onChange={setNext} />
        {message(passwordMsg)}
        <Button type="submit" size="sm" className="w-fit" disabled={busy !== null}>
          {busy === "password" ? "Saving…" : "Change password"}
        </Button>
      </form>
    </div>
  );
}
