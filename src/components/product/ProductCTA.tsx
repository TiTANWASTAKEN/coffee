import { storeEnabled } from "@/config/features";
import type { CoffeeProduct } from "@/data/products";
import { BuyButton } from "@/components/ui/BuyButton";
import { Reveal } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";

export function ProductCTA({ product }: { product: CoffeeProduct }) {
  return (
    <section aria-labelledby="product-cta-heading" className="relative overflow-hidden border-t border-line py-section text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(55% 60% at 50% 100%, color-mix(in oklab, var(--accent-deep) 50%, transparent), transparent 70%)" }}
      />
      <div className="container-site relative flex flex-col items-center">
        <Reveal variant="fadeIn">
          <p className="eyebrow text-accent">{storeEnabled ? "Order direct" : "Available on Amazon"}</p>
        </Reveal>
        <RevealText id="product-cta-heading" lines={["Buy", product.name]} className="mt-7 text-display-lg font-light uppercase" />
        <Reveal delay={0.2}>
          <p className="mt-7 text-lead text-muted">
            {product.blend}. {product.tagline}
          </p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10">
          <BuyButton product={product} size="lg" label={`Buy ${product.name}`} />
        </Reveal>
      </div>
    </section>
  );
}
