import { motion } from "framer-motion";
import { ease, viewportOnce } from "@/lib/motion";

interface MeterProps {
  value: number;
  max?: number;
  label: string;
  variant?: "dots" | "bars";
  className?: string;
  delay?: number;
}

/** Indicative 1–5 scale. Fills in sequence when scrolled into view. */
export function Meter({ value, max = 5, label, variant = "dots", className = "", delay = 0 }: MeterProps) {
  return (
    <motion.div
      role="img"
      aria-label={`${label}: ${value} out of ${max}`}
      className={`flex items-center ${variant === "dots" ? "gap-1.5" : "gap-1"} ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}
    >
      {Array.from({ length: max }, (_, i) => {
        const on = i < value;
        return variant === "dots" ? (
          <span key={i} className="relative block size-2 rounded-full border border-line-strong">
            {on && (
              <motion.span
                className="absolute -inset-px rounded-full bg-accent"
                variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { duration: 0.5, ease } } }}
              />
            )}
          </span>
        ) : (
          <span key={i} className="relative block h-[3px] flex-1 overflow-hidden bg-line">
            {on && (
              <motion.span
                className="absolute inset-0 origin-left bg-accent"
                variants={{ hidden: { scaleX: 0 }, visible: { scaleX: 1, transition: { duration: 0.6, ease } } }}
              />
            )}
          </span>
        );
      })}
    </motion.div>
  );
}
