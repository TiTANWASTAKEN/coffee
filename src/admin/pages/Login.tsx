import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { site } from "@/config/site";
import { errorMessage } from "@/lib/api";
import { useAdminAuth } from "../auth";
import { Alert, AdminButton, FormField, inputClass } from "../ui";

export default function Login() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-sm border border-line bg-surface p-8">
        <p className="font-display text-xl uppercase tracking-[0.2em]">{site.name}</p>
        <h1 className="mt-1 font-sans text-body-sm text-muted">Sign in to the store admin</h1>

        <div className="mt-8 flex flex-col gap-5">
          <FormField label="Email">
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </FormField>
          <FormField label="Password">
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </FormField>
          {error && <Alert>{error}</Alert>}
          <AdminButton type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? "Signing in…" : "Sign in"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
