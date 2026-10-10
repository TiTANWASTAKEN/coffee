import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import type { CoffeeProduct } from "@/data/products";
import { BuyButton } from "@/components/ui/BuyButton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ease } from "@/lib/motion";

/**
 * Keeps the buy button one tap away. On phones it shows from the start (the product
 * image pushes the hero's button below the fold); on desktop it appears once the hero
 * has scrolled away. Hides near the page end, where the closing CTA takes over.
 */
export function StickyBuyBar({ product }: { product: CoffeeProduct }) {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const { scrollY } = useScroll();
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [nearEnd, setNearEnd] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const viewport = window.innerHeight;
    setScrolledPastHero(y > viewport * 0.9);
    setNearEnd(y + viewport > document.documentElement.scrollHeight - viewport * 1.1);
  });

  const visible = (desktop ? scrolledPastHero : true) && !nearEnd;

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          aria-label={`Buy ${product.name}`}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.6, ease, delay: desktop ? 0 : 0.6 }}
        >
          <div className="container-site flex h-[4.5rem] items-center justify-between gap-4">
            <div className="flex min-w-0 items-baseline gap-4">
              <span className="eyebrow hidden text-accent sm:inline">{product.number}</span>
              <span className="truncate font-display text-xl uppercase tracking-[0.04em]">{product.name}</span>
              <span className="label hidden font-medium text-muted md:inline">{product.blend}</span>
            </div>
            <BuyButton product={product} size="sm" compact />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
