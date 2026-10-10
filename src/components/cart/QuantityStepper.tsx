import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  /** Allow stepping down to 0 (removes the line). */
  allowZero?: boolean;
}

export function QuantityStepper({ value, max, onChange, label, allowZero = true }: QuantityStepperProps) {
  const min = allowZero ? 0 : 1;
  const button = "grid size-9 place-items-center text-muted transition-colors hover:text-ivory disabled:opacity-30 disabled:hover:text-muted";
  return (
    <div role="group" aria-label={`Quantity for ${label}`} className="inline-flex items-center border border-line-strong">
      <button type="button" className={button} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </button>
      <span aria-live="polite" className="w-8 text-center text-body-sm tabular-nums">
        {value}
      </span>
      <button type="button" className={button} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </button>
    </div>
  );
}
