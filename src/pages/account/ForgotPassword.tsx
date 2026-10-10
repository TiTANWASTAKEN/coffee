import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { AuthShell } from "@/components/account/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";

export default function ForgotPassword() {
  useDocumentTitle("Reset your password");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/account/forgot", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <AuthShell eyebrow="Account" title="Check your inbox.">
        <p className="text-muted">
          If an account exists for <span className="text-ivory">{email}</span>, we’ve sent a link to reset your password. It expires in one hour.
        </p>
        <Link to="/account/login" className="mt-10 inline-block text-ivory underline">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Account" title="Forgot password?" intro="Enter your email and we’ll send you a link to choose a new one.">
      <form onSubmit={onSubmit} className="flex flex-col gap-7">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={setEmail} />
        <FormError>{error}</FormError>
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <Link to="/account/login" className="mt-10 inline-block text-muted underline hover:text-ivory">
        Back to sign in
      </Link>
    </AuthShell>
  );
}
