import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { easeCurtain, viewportOnce } from "@/lib/motion";

interface ImageRevealProps {
  children: ReactNode;
  className?: string;
  /** Subtle scroll parallax on the inner media (in px). 0 to disable. */
  parallax?: number;
}

/** Curtain-wipe reveal with a slow settle and optional scroll parallax. */
export function ImageReveal({ children, className, parallax = 40 }: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-parallax, parallax]);

  return (
    <motion.div
      ref={ref}
      className={`relative overflow-hidden ${className ?? ""}`}
      initial={{ clipPath: "inset(100% 0 0 0)" }}
      whileInView={{ clipPath: "inset(0% 0 0 0)" }}
      viewport={viewportOnce}
      transition={{ duration: 1.1, ease: easeCurtain }}
    >
      <motion.div
        className="absolute -inset-y-[50px] inset-x-0 will-change-transform"
        style={parallax ? { y } : undefined}
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
