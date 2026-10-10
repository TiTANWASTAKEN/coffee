import { site } from "@/config/site";

/** "BITTER TRUTH" with a small "COFFEE" line beneath — fits beside the nav icons on a 320px phone. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex flex-col font-display uppercase leading-none ${className}`}>
      <span className="text-[0.95rem] font-medium tracking-[0.18em] sm:text-[1.05rem] sm:tracking-[0.24em]">{site.shortName}</span>
      <span className="mt-1.5 font-sans text-[0.55rem] font-medium tracking-[0.62em] text-ivory/55">Coffee</span>
    </span>
  );
}
