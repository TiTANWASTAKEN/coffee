import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { Fulfillment, PaymentStatus } from "@shared/store";

export const inputClass =
  "w-full min-h-11 rounded-sm border border-line-strong bg-ink px-3 text-body-sm text-ivory placeholder:text-faint focus:border-ivory focus:outline-none disabled:opacity-50";

type Tone = "primary" | "secondary" | "danger";

const buttonTones: Record<Tone, string> = {
  primary: "bg-ivory text-ink hover:bg-beige",
  secondary: "border border-line-strong text-ivory hover:border-ivory",
  danger: "border border-danger/40 text-danger hover:border-danger hover:bg-danger/10",
};

export function adminButton(tone: Tone = "primary", className = "") {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-sm px-4 text-body-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonTones[tone]} ${className}`;
}

export function AdminButton({ tone = "primary", className = "", type = "button", ...props }: { tone?: Tone } & ComponentPropsWithoutRef<"button">) {
  return <button type={type} className={adminButton(tone, className)} {...props} />;
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-sm border border-line bg-surface ${className}`}>
      {title && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 className="font-sans text-body-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function FormField({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-body-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-[0.8rem] text-faint">{hint}</span>}
    </label>
  );
}

export function Alert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  const styles = tone === "error" ? "border-danger/40 bg-danger/10 text-danger" : "border-success/40 bg-success/10 text-success";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-sm border px-4 py-3 text-body-sm ${styles}`}>
      {children}
    </p>
  );
}

const badgeStyles: Record<PaymentStatus | Fulfillment | "active" | "hidden", string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  failed: "bg-danger/15 text-danger",
  unfulfilled: "bg-warning/15 text-warning",
  shipped: "bg-info/15 text-info",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-ivory/10 text-muted",
  active: "bg-success/15 text-success",
  hidden: "bg-ivory/10 text-muted",
};

export function Badge({ value }: { value: keyof typeof badgeStyles }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium capitalize ${badgeStyles[value]}`}>{value}</span>;
}

export function Loading() {
  return <p className="py-10 text-body-sm text-muted">Loading…</p>;
}
