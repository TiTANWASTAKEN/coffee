import type { ComponentPropsWithoutRef } from "react";
import { indianStates } from "@/data/indianStates";

const control = "min-h-12 border-b border-line-strong bg-transparent text-ivory placeholder:text-faint focus:border-ivory focus:outline-none";

interface FieldProps extends Omit<ComponentPropsWithoutRef<"input">, "onChange"> {
  label: string;
  onChange: (value: string) => void;
}

/** Underlined storefront text field with an eyebrow label. */
export function Field({ label, onChange, className = "", ...props }: FieldProps) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="eyebrow text-muted">{label}</span>
      <input {...props} onChange={(e) => onChange(e.target.value)} className={control} />
    </label>
  );
}

export function StateField({ value, onChange, className = "" }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="eyebrow text-muted">State</span>
      <select required autoComplete="address-level1" value={value} onChange={(e) => onChange(e.target.value)} className={`${control} [&>option]:bg-ink`}>
        <option value="" disabled>
          Select…
        </option>
        {indianStates.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </label>
  );
}

export function FormError({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="border border-coffee-light/60 bg-coffee/20 px-4 py-3 text-body-sm text-ivory">
      {children}
    </p>
  );
}
