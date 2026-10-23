import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import type { CustomerAccount } from "@shared/store";
import { EMAIL_PATTERN } from "@shared/email";
import { AuthShell, safeNext } from "@/components/account/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";
import { useAccount } from "@/store/account";

export default function Register() {
  useDocumentTitle("Create an account");
  const { customer, setCustomer } = useAccount();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (customer && !busy) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setCustomer(await api<CustomerAccount>("/account/register", { method: "POST", body: { name, email, phone, password } }));
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="Account" title="Join us." intro="Track your orders and save your addresses for next time.">
      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <Field label="Full name" autoComplete="name" required maxLength={120} value={name} onChange={setName} />
        <Field label="Email" type="text" inputMode="email" autoComplete="email" pattern={EMAIL_PATTERN} title="Use an address like name@email.com, name@email.in, or name@email.co.in" required value={email} onChange={setEmail} />
        <Field label="Phone (optional)" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={setPhone} />
        <Field label="Password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={setPassword} />
        <p className="-mt-4 text-body-sm text-faint">At least 8 characters.</p>
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-10 border-t border-line pt-8 text-muted">
        Already have an account?{" "}
        <Link to={`/account/login?next=${encodeURIComponent(next)}`} className="text-ivory underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
