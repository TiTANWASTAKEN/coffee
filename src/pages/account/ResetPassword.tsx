import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { CustomerAccount } from "@shared/store";
import { AuthShell } from "@/components/account/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";
import { useAccount } from "@/store/account";

export default function ResetPassword() {
  useDocumentTitle("Choose a new password");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { setCustomer } = useAccount();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("The two passwords don’t match.");
    setBusy(true);
    setError(null);
    try {
      setCustomer(await api<CustomerAccount>("/account/reset", { method: "POST", body: { token, password } }));
      navigate("/account", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell eyebrow="Account" title="Link incomplete.">
        <p className="text-muted">This reset link is missing its code. Open the link from your email again, or request a new one.</p>
        <Link to="/account/forgot" className="mt-10 inline-block text-ivory underline">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Account" title="New password.">
      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <Field label="New password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={setPassword} />
        <Field label="Confirm password" type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={setConfirm} />
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Saving…" : "Save and sign in"}
        </Button>
      </form>
      {error?.includes("expired") && (
        <Link to="/account/forgot" className="mt-8 inline-block text-ivory underline">
          Request a new link
        </Link>
      )}
    </AuthShell>
  );
}
