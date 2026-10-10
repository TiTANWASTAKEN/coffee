import type { BrewMethod } from "@/data/brewing";

/** Minimal line drawings for each brewing method. */
export function BrewIcon({ method, className = "" }: { method: BrewMethod["id"]; className?: string }) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.1,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (method === "french-press") {
    return (
      <svg {...common}>
        <circle cx="23" cy="5.5" r="1.6" />
        <path d="M23 7v9" />
        <path d="M12 14h22" />
        <rect x="14" y="14" width="18" height="27" rx="1" />
        <path d="M15.5 25h15" />
        <path d="M32 18h3.5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H32" />
        <path d="M12.5 43h21" />
      </svg>
    );
  }

  if (method === "pour-over") {
    return (
      <svg {...common}>
        <path d="M11 11h26l-8.5 14h-9z" />
        <path d="M17 7h14" />
        <path d="M24 27.5v3" strokeDasharray="1 2" />
        <path d="M16 33h16l2.5 10h-21z" />
        <path d="M37 13c2 0 3 1 3 3s-1.5 3-4 4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M18 9c1.5 2 1.5 4 0 6M24 7c1.5 2 1.5 4 0 6M30 9c1.5 2 1.5 4 0 6" />
      <path d="M11 21h22v6a11 11 0 0 1-11 11 11 11 0 0 1-11-11z" />
      <path d="M33 23.5h2.5a3.5 3.5 0 0 1 0 7H32" />
      <path d="M7 42.5h34" />
    </svg>
  );
}
