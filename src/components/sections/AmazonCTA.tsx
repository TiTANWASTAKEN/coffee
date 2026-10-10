import { storeEnabled } from "@/config/features";
import { products, productThemeStyle } from "@/data/products";
import { BuyButton, ShopButton } from "@/components/ui/BuyButton";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";
import { PriceTag } from "@/components/product/PriceTag";

export function AmazonCTA() {
  return (
    <section aria-labelledby="cta-heading" className="relative overflow-hidden border-t border-line py-section">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_100%,rgb(90_57_40/0.32),transparent_70%)]"
      />
      <div className="container-site relative flex flex-col items-center text-center">
        <Reveal variant="fadeIn">
          <p className="eyebrow text-muted">{storeEnabled ? "Order direct" : "Available on Amazon"}</p>
        </Reveal>
        <RevealText id="cta-heading" lines={["Ready to find", "your truth?"]} className="mt-7 text-display-lg font-light uppercase" />
        <Reveal delay={0.2}>
          <p className="mt-7 text-lead text-muted">Your next cup is waiting.</p>
        </Reveal>
        <Reveal delay={0.3} className="mt-10">
          <ShopButton size="lg" />
        </Reveal>

        <Stagger className="mt-20 grid w-full gap-px border border-line bg-line sm:grid-cols-3" gap={0.1}>
          {products.map((p) => (
            <StaggerItem key={p.id}>
              <div style={productThemeStyle(p)} className="flex h-full flex-col items-center bg-ink px-6 py-10 transition-colors duration-700 hover:bg-surface">
                <span className="eyebrow text-faint">{p.number}</span>
                <h3 className="mt-4 font-display text-display-xs uppercase tracking-[0.02em]">{p.name}</h3>
                <p className="label mt-2 font-medium text-accent">{p.blendShort}</p>
                <PriceTag slug={p.slug} className="mt-5 justify-center" />
                <BuyButton product={p} variant="outline" size="sm" compact className="mt-8" />
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
