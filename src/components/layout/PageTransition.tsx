import { useLayoutEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import { motion } from "framer-motion";
import { site } from "@/config/site";
import { ease } from "@/lib/motion";

/**
 * Wraps every page. On route change the old page fades under a dark
 * panel bearing the monogram, the new page mounts, and the panel lifts.
 * Total ≈ 450ms.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { hash } = useLocation();

  useLayoutEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
    // Mount only: hash changes within the same page are handled by Layout.
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.3, ease, delay: 0.05 } }}
        exit={{ opacity: 0, transition: { duration: 0.2, ease } }}
      >
        {children}
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[45] grid place-items-center bg-ink"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, transition: { duration: 0.3, ease, delay: 0.08 } }}
        exit={{ opacity: 1, transition: { duration: 0.2, ease } }}
      >
        <span className="font-display text-xl font-light uppercase tracking-[0.3em] text-ivory/70">{site.monogram}</span>
      </motion.div>
    </>
  );
}
