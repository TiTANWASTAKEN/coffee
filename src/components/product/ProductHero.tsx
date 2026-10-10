import { useRef } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { storeEnabled } from "@/config/features";
import type { CoffeeProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";
import { BuyButton } from "@/components/ui/BuyButton";
import { ease } from "@/lib/motion";
import { useCoffeeImages } from "@/store/catalog";
import { PriceTag } from "./PriceTag";

export function ProductHero({ product }: { product: CoffeeProduct }) {
  const ref = useRef<HTMLElement>(null);
  const { image } = useCoffeeImages(product);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const numberY = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, ease, delay },
  });

  return (
    <section ref={ref} aria-labelledby="product-heading" className="relative overflow-hidden pt-nav">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 72% 45%, color-mix(in oklab, var(--accent-deep) 55%, transparent), transparent 72%), radial-gradient(40% 40% at 10% 100%, color-mix(in oklab, var(--accent-deep) 25%, transparent), transparent 70%)",
        }}
      />
      <motion.span
        aria-hidden="true"
        style={{ y: numberY }}
        className="pointer-events-none absolute -bottom-[0.18em] -right-[0.04em] select-none will-change-transform font-display text-[44vw] font-light leading-none text-ivory/[0.025] lg:text-[34vw]"
      >
        {product.number}
      </motion.span>

      <div className="container-site relative grid min-h-[calc(100svh_-_var(--spacing-nav))] items-center gap-10 py-10 lg:grid-cols-12 lg:gap-8 lg:py-16">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <motion.nav aria-label="Breadcrumb" {...fade(0)}>
            <ol className="eyebrow flex items-center gap-3 text-faint">
              <li>
                <Link to="/coffee" className="link-underline transition-colors hover:text-ivory">
                  The Coffee
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-muted">
                {product.name}
              </li>
            </ol>
          </motion.nav>

          <motion.p className="eyebrow mt-10 flex items-center gap-4 text-accent" {...fade(0.1)}>
            N°{product.number}
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            {product.blend}
          </motion.p>

          <RevealText
            as="h1"
            id="product-heading"
            play
            delay={0.15}
            lines={product.name.split(" ")}
            className="mt-6 text-display-xl font-light uppercase"
          />

          <motion.p className="mt-8 font-display text-display-xs italic text-ivory/90" {...fade(0.45)}>
            {product.tagline}
          </motion.p>
          <motion.p className="mt-5 max-w-md text-muted" {...fade(0.55)}>
            {product.description}
          </motion.p>

          <motion.ul className="mt-8 flex flex-wrap gap-2" aria-label="Personality" {...fade(0.65)}>
            {product.personality.map((trait) => (
              <li key={trait} className="label border border-line-strong px-3.5 py-2 font-medium text-ivory/80">
                {trait}
              </li>
            ))}
          </motion.ul>

          <motion.div {...fade(0.7)}>
            <PriceTag slug={product.slug} className="mt-10" />
          </motion.div>
          <motion.div className="mt-6 flex flex-col gap-3 sm:flex-row" {...fade(0.75)}>
            <BuyButton product={product} size="lg" compact />
            <ButtonLink to="#taste" variant="outline" size="lg" icon="none">
              Taste profile
            </ButtonLink>
          </motion.div>
          <motion.p className="mt-5 text-body-sm text-faint" {...fade(0.85)}>
            {storeEnabled ? "Secure checkout with Razorpay — UPI, cards and netbanking." : "Available on Amazon."}
          </motion.p>
        </div>

        <motion.div
          className="relative order-1 aspect-[4/5] overflow-hidden lg:order-2 lg:col-span-6 lg:col-start-7 lg:aspect-auto lg:h-[80svh] lg:max-h-[56rem]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease }}
        >
          <motion.div className="absolute -inset-y-[8%] inset-x-0 will-change-transform" style={{ y: imageY }}>
            <SmartImage asset={image} priority sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
