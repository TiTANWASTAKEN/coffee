import { useState, type FormEvent } from "react";
import type { Coupon, CouponKind } from "@shared/store";
import { errorMessage } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { useAdminAuth, useAdminQuery } from "../auth";
import { AdminButton, Alert, Card, FormField, inputClass, Loading, PageTitle } from "../ui";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function suggestCode(): string {
  let code = "BT";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function describe(coupon: Coupon): string {
  return coupon.kind === "percent" ? `${coupon.value}% off` : `${formatPrice(coupon.value)} off`;
}

export default function Coupons() {
  const { request } = useAdminAuth();
  const { data, setData, error, loading, reload } = useAdminQuery<Coupon[]>("/coupons");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<CouponKind>("flat");
  const [amount, setAmount] = useState("50");
  const [maxUses, setMaxUses] = useState("1");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const parsed = Number(amount);
    const value = kind === "percent" ? Math.round(parsed) : Math.round(parsed * 100);
    try {
      await request<Coupon>("/coupons", {
        method: "POST",
        body: { code, kind, value, maxUses: Math.round(Number(maxUses)) },
      });
      setCode("");
      setMessage({ tone: "success", text: "Code saved." });
      await reload();
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function toggle(coupon: Coupon) {
    setMessage(null);
    try {
      const saved = await request<Coupon>(`/coupons/${coupon.id}`, { method: "PATCH", body: { active: !coupon.active } });
      setData((list) => list?.map((item) => (item.id === saved.id ? saved : item)) ?? list);
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    }
  }

  return (
    <>
      <PageTitle title="Coupons" subtitle="One code per order. The discount comes off the coffee. Shipping stays as it is." />
      {message && <div className="mb-6"><Alert tone={message.tone}>{message.text}</Alert></div>}
      {error && <div className="mb-6"><Alert>{error}</Alert></div>}

      <Card title="New code" className="mb-6">
        <form onSubmit={(e) => void onCreate(e)} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" hint="Leave this blank to generate one.">
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputClass} maxLength={20} autoCapitalize="characters" />
              <AdminButton type="button" tone="secondary" onClick={() => setCode(suggestCode())}>
                Generate
              </AdminButton>
            </div>
          </FormField>
          <FormField label="Discount">
            <select value={kind} onChange={(e) => setKind(e.target.value as CouponKind)} className={inputClass}>
              <option value="flat">Rupees off</option>
              <option value="percent">Percent off</option>
            </select>
          </FormField>
          <FormField label={kind === "percent" ? "Percent" : "Rupees off the coffee"}>
            <input
              required
              type="number"
              min={1}
              max={kind === "percent" ? 100 : 100000}
              step={kind === "percent" ? 1 : "0.01"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="How many times it can be used">
            <input required type="number" min={1} max={100000} step={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={inputClass} />
          </FormField>
          <div className="sm:col-span-2">
            <AdminButton type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save code"}
            </AdminButton>
          </div>
        </form>
      </Card>

      <Card>
        {loading && !data ? (
          <Loading />
        ) : !data?.length ? (
          <p className="py-6 text-body-sm text-muted">No codes yet.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-body-sm">
              <thead className="text-[0.75rem] uppercase tracking-wider text-faint">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Code</th>
                  <th className="px-3 py-2.5 font-medium">Discount</th>
                  <th className="px-3 py-2.5 text-right font-medium">Uses</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-medium tracking-wide">{coupon.code}</td>
                    <td className="px-3 py-3">{describe(coupon)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {coupon.used} / {coupon.maxUses}
                    </td>
                    <td className="px-3 py-3 text-muted">{coupon.active ? "On" : "Off"}</td>
                    <td className="px-5 py-3 text-right">
                      <AdminButton tone="secondary" onClick={() => void toggle(coupon)}>
                        {coupon.active ? "Turn off" : "Turn on"}
                      </AdminButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
