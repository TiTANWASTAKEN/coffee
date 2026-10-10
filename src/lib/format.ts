const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });

/** Formats an amount in paise, e.g. 49900 → "₹499". */
export function formatPrice(paise: number): string {
  return inr.format(paise / 100);
}

/** Formats a SQLite UTC timestamp ("2026-10-08 05:53:08") in local time. */
export function formatDate(value: string | null, withTime = true): string {
  if (!value) return "—";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}
