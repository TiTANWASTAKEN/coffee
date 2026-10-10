import { Link } from "react-router";
import type { CoffeeProduct } from "@/data/products";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

/** The facts (with "To be announced" for unconfirmed fields) + brewing suggestions. */
export function ProductDetails({ product }: { product: CoffeeProduct }) {
  return (
    <section aria-label="Details and brewing" className="border-t border-line py-section">
      <div className="container-site grid gap-20 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Reveal variant="fadeIn">
            <p className="eyebrow text-muted">Details</p>
          </Reveal>
          <Reveal>
            <h2 className="mt-6 text-display-sm font-light">The facts.</h2>
          </Reveal>
          <Reveal>
            <dl className="mt-10 border-b border-line">
              {product.details.map((d) => (
                <div key={d.label} className="flex items-baseline justify-between gap-6 border-t border-line py-4">
                  <dt className="eyebrow text-muted">{d.label}</dt>
                  <dd className={d.value ? "text-right text-ivory/90" : "text-right italic text-faint"}>{d.value ?? "To be announced"}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal variant="fadeIn">
            <p className="eyebrow text-muted">Brewing</p>
          </Reveal>
          <Reveal>
            <h2 className="mt-6 text-display-sm font-light">Suggestions, not rules.</h2>
          </Reveal>
          <Stagger as="ol" className="mt-10 border-b border-line" gap={0.08}>
            {product.brewing.map((b, i) => (
              <StaggerItem as="li" key={b.method} className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 border-t border-line py-6 sm:grid-cols-[2.5rem_12rem_1fr]">
                <span className="eyebrow text-faint">0{i + 1}</span>
                <span className="font-display text-display-xs">{b.method}</span>
                <span className="col-start-2 text-muted sm:col-start-3">{b.note}</span>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal delay={0.2}>
            <Link to="/journal/how-to-brew-better-coffee" className="label link-underline mt-8 inline-block font-medium text-ivory/85">
              How to brew better coffee
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
