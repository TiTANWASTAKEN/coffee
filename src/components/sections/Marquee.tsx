import { Fragment, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const phrases = ["Nothing hidden", "Three coffees", "Three personalities", "No pretence"];

/** Oversized type band that drifts horizontally with scroll. Decorative. */
export function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-28%"]);

  return (
    <div ref={ref} aria-hidden="true" className="overflow-hidden border-y border-line py-8 md:py-12">
      <motion.div style={{ x }} className="flex w-max items-center gap-[0.4em] whitespace-nowrap font-display text-display-lg font-light uppercase will-change-transform">
        {[...phrases, ...phrases].map((phrase, i) => (
          <Fragment key={i}>
            <span className={i % 2 ? "text-outline" : "text-ivory/90"}>{phrase}</span>
            <span className="inline-block size-[0.1em] rounded-full bg-accent" />
          </Fragment>
        ))}
      </motion.div>
    </div>
  );
}
