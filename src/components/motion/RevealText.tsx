import type { ElementType, ReactNode } from "react";
import { motion } from "framer-motion";
import { ease, viewportOnce } from "@/lib/motion";

interface RevealTextProps {
  /** Each entry is rendered as one masked line. */
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  /** When provided, animation is controlled (e.g. wait for intro) instead of in-view. */
  play?: boolean;
  id?: string;
}

/** Editorial line-by-line mask reveal for headings. */
export function RevealText({
  lines,
  as: Tag = "h2",
  className,
  lineClassName,
  delay = 0,
  stagger = 0.09,
  play,
  id,
}: RevealTextProps) {
  const controlled = play !== undefined;
  return (
    <Tag className={`font-display ${className ?? ""}`} id={id}>
      <motion.span
        className="block"
        initial="hidden"
        {...(controlled ? { animate: play ? "visible" : "hidden" } : { whileInView: "visible", viewport: viewportOnce })}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      >
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
            <motion.span
              className={`block ${lineClassName ?? ""}`}
              variants={{
                hidden: { y: "110%" },
                visible: { y: "0%", transition: { duration: 1, ease } },
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
