import { useState, type FormEvent } from "react";
import { EMAIL_PATTERN } from "@shared/email";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { site } from "@/config/site";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";

export default function Waitlist() {
  useDocumentTitle("Join the list");
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"idle" | "sending" | "added" | "exists">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (phase === "sending") return;
    setError(null);
    setPhase("sending");
    try {
      const result = await api<{ already: boolean }>("/waitlist", { method: "POST", body: { email } });
      setPhase(result.already ? "exists" : "added");
    } catch (err) {
      setPhase("idle");
      setError(errorMessage(err));
    }
  }

  return (
    <PageTransition>
      <section className="relative flex min-h-[100svh] items-end overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(139,90,43,0.28),transparent_55%),linear-gradient(180deg,#161411_0%,#0d0c0b_70%)]" />
        <div className="container-site relative z-10 pb-24 pt-36 md:pb-32">
          <p className="eyebrow text-muted">{site.name}</p>
          <h1 className="mt-6 max-w-3xl font-display text-display-md font-light text-ivory">The list opens before the coffee does.</h1>
          <p className="mt-6 max-w-xl text-body text-muted">Three coffees. Nothing hidden. Leave your email and we’ll write when the first bags are ready.</p>

          {phase === "added" || phase === "exists" ? (
            <p role="status" className="mt-12 max-w-md border border-line px-6 py-5 text-body-sm text-ivory">
              {phase === "exists" ? "This email is already on the list." : "You’re on the list. We’ll write to this address when it’s time."}
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-12 flex max-w-xl flex-col gap-6 sm:flex-row sm:items-end">
              <Field
                label="Email"
                type="text"
                inputMode="email"
                name="email"
                autoComplete="email"
                pattern={EMAIL_PATTERN}
                title="Use an address like name@email.com, name@email.in, or name@email.co.in"
                required
                maxLength={200}
                value={email}
                onChange={setEmail}
                placeholder="name@email.co.in"
                className="min-w-0 flex-1"
              />
              <Button type="submit" size="lg" icon="right" disabled={phase === "sending"} className="sm:mb-px">
                {phase === "sending" ? "Saving…" : "Join the list"}
              </Button>
            </form>
          )}
          {error && (
            <p role="alert" className="mt-4 text-body-sm text-ivory">
              {error}
            </p>
          )}
        </div>
      </section>
    </PageTransition>
  );
}
