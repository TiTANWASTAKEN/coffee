import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { stagger as staggerVariants, variants, viewportOnce, type RevealVariant } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  className?: string;
}

/** Animates its children once when they scroll into view. */
export function Reveal({ children, variant = "fadeUp", delay = 0, className }: RevealProps) {
  const base = variants[variant];
  const resolved = delay
    ? { ...base, visible: { ...base.visible, transition: { ...base.visible.transition, delay } } }
    : base;
  return (
    <motion.div
      className={className}
      variants={resolved}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </motion.div>
  );
}

interface StaggerProps {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  as?: "div" | "ul" | "ol";
}

/** Parent that staggers its <StaggerItem> children into view. */
export function Stagger({ children, className, gap = 0.1, delay = 0, as = "div" }: StaggerProps) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      variants={staggerVariants(gap, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {children}
    </Component>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  as?: "div" | "li";
}

export function StaggerItem({ children, className, variant = "fadeUp", as = "div" }: StaggerItemProps) {
  const Component = motion[as];
  return (
    <Component className={className} variants={variants[variant]}>
      {children}
    </Component>
  );
}
