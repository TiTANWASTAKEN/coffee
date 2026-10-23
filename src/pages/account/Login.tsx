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

export default function Login() {
  useDocumentTitle("Sign in");
  const { customer, setCustomer } = useAccount();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (customer && !busy) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setCustomer(await api<CustomerAccount>("/account/login", { method: "POST", body: { email, password } }));
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="Account" title="Sign in." intro="See your orders and check out faster with saved addresses.">
      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <Field label="Email" type="text" inputMode="email" autoComplete="email" pattern={EMAIL_PATTERN} title="Use an address like name@email.com, name@email.in, or name@email.co.in" required value={email} onChange={setEmail} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={setPassword} />
        <Link to="/account/forgot" className="-mt-3 w-fit text-body-sm text-muted underline hover:text-ivory">
          Forgot your password?
        </Link>
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-10 border-t border-line pt-8 text-muted">
        New here?{" "}
        <Link to={`/account/register?next=${encodeURIComponent(next)}`} className="text-ivory underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
