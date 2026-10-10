import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { RevealText } from "@/components/motion/RevealText";
import { ease } from "@/lib/motion";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode[];
  intro?: ReactNode;
  aside?: ReactNode;
}

/** Shared editorial header for inner pages. */
export function PageHeader({ eyebrow, title, intro, aside }: PageHeaderProps) {
  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease, delay },
  });

  return (
    <header className="container-site grid gap-12 pb-section-sm pt-[calc(var(--spacing-nav)_+_clamp(4rem,10vw,9rem))] lg:grid-cols-12 lg:items-end lg:gap-8">
      <div className="lg:col-span-8">
        <motion.p className="eyebrow flex items-center gap-4 text-muted" {...fade(0)}>
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          {eyebrow}
        </motion.p>
        <RevealText as="h1" play delay={0.1} lines={title} className="mt-8 text-display-xl font-light uppercase" />
        {intro && (
          <motion.p className="mt-10 max-w-xl text-lead text-muted" {...fade(0.4)}>
            {intro}
          </motion.p>
        )}
      </div>
      {aside && (
        <motion.div className="lg:col-span-3 lg:col-start-10" {...fade(0.5)}>
          {aside}
        </motion.div>
      )}
    </header>
  );
}
