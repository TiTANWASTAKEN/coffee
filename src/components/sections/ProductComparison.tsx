import { useState } from "react";
import { Link } from "react-router";
import { ArrowRight, MoveHorizontal } from "lucide-react";
import { products, productThemeStyle, type CoffeeProduct } from "@/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Meter } from "@/components/ui/Meter";
import { Reveal } from "@/components/motion/Reveal";

type Attribute =
  | { label: string; kind: "text"; get: (p: CoffeeProduct) => string }
  | { label: string; kind: "meter"; get: (p: CoffeeProduct) => number };

const attributes: Attribute[] = [
  { label: "Character", kind: "text", get: (p) => p.character },
  { label: "Intensity", kind: "meter", get: (p) => p.intensity },
  { label: "Body", kind: "meter", get: (p) => p.profile.body },
  { label: "Aroma", kind: "meter", get: (p) => p.profile.aroma },
  { label: "Balance", kind: "meter", get: (p) => p.profile.balance },
  { label: "Best for", kind: "text", get: (p) => p.bestFor },
];

function Value({ attribute, product, delay = 0 }: { attribute: Attribute; product: CoffeeProduct; delay?: number }) {
  if (attribute.kind === "meter") {
    return <Meter value={attribute.get(product)} label={`${product.name} ${attribute.label.toLowerCase()}`} delay={delay} />;
  }
  return <span className="text-body-sm text-ivory/85">{attribute.get(product)}</span>;
}

export function ProductComparison() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const focus = hovered ?? pinned;
  const dim = (id: string) => (focus && focus !== id ? "opacity-35" : "opacity-100");

  return (
    <section id="compare" aria-labelledby="compare-heading" className="scroll-mt-nav border-t border-line py-section">
      <div className="container-site">
        <SectionHeading
          id="compare-heading"
          eyebrow="Compare"
          title={["Find your", "truth"]}
          description="Same honesty. Different personalities. Compare them side by side."
        />

        {/* Desktop: comparison table */}
        <Reveal className="mt-16 hidden lg:block" delay={0.1}>
          <p className="eyebrow mb-8 text-faint">Select a coffee to bring it forward</p>
          <table className="w-full table-fixed border-collapse text-left" onMouseLeave={() => setHovered(null)}>
            <caption className="sr-only">Comparison of Honest Truth, Dark Truth and Bitter Truth</caption>
            <colgroup>
              <col className="w-[22%]" />
              {products.map((p) => (
                <col key={p.id} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-line-strong">
                <td />
                {products.map((p) => (
                  <th key={p.id} scope="col" className={`pb-8 pr-8 align-bottom font-normal transition-opacity duration-500 ${dim(p.id)}`} style={productThemeStyle(p)}>
                    <button
                      type="button"
                      aria-pressed={pinned === p.id}
                      onClick={() => setPinned((v) => (v === p.id ? null : p.id))}
                      onMouseEnter={() => setHovered(p.id)}
                      onFocus={() => setHovered(p.id)}
                      onBlur={() => setHovered(null)}
                      className="group block w-full text-left"
                    >
                      <span className="eyebrow flex items-center gap-3 text-faint">
                        {p.number}
                        <span className={`h-px bg-accent transition-[width] duration-700 ${focus === p.id ? "w-10" : "w-4"}`} />
                      </span>
                      <span className="mt-4 block font-display text-display-xs uppercase tracking-[0.02em] text-ivory">{p.name}</span>
                      <span className="label mt-2 block font-medium text-muted">{p.blend}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attributes.map((a, row) => (
                <tr key={a.label} className="border-b border-line">
                  <th scope="row" className="eyebrow py-6 pr-6 font-medium text-muted">
                    {a.label}
                  </th>
                  {products.map((p, col) => (
                    <td
                      key={p.id}
                      onMouseEnter={() => setHovered(p.id)}
                      className={`py-6 pr-8 transition-opacity duration-500 ${dim(p.id)}`}
                      style={productThemeStyle(p)}
                    >
                      <Value attribute={a} product={p} delay={row * 0.08 + col * 0.05} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {products.map((p) => (
                  <td key={p.id} className={`pt-8 transition-opacity duration-500 ${dim(p.id)}`} onMouseEnter={() => setHovered(p.id)}>
                    <Link to={`/coffee/${p.slug}`} className="group label inline-flex min-h-11 items-center gap-3 font-medium text-ivory">
                      <span className="link-underline">Explore {p.name}</span>
                      <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4 transition-transform duration-500 group-hover:translate-x-1" />
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </Reveal>

        {/* Mobile / tablet: swipeable cards */}
        <div className="mt-12 lg:hidden">
          <p className="eyebrow mb-5 flex items-center gap-3 text-faint" aria-hidden="true">
            <MoveHorizontal strokeWidth={1.3} className="size-4" /> Swipe to compare
          </p>
          <ul className="no-scrollbar -mx-gutter flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-gutter px-gutter pb-2">
            {products.map((p) => (
              <li
                key={p.id}
                style={productThemeStyle(p)}
                className="w-[84%] shrink-0 snap-start border border-line bg-surface p-6 sm:w-[46%]"
              >
                <p className="eyebrow flex items-center gap-3 text-faint">
                  {p.number} <span className="h-px w-6 bg-accent" />
                </p>
                <h3 className="mt-4 font-display text-display-xs uppercase tracking-[0.02em]">{p.name}</h3>
                <p className="label mt-2 font-medium text-muted">{p.blend}</p>
                <dl className="mt-6">
                  {attributes.map((a) => (
                    <div key={a.label} className="flex min-h-14 items-center justify-between gap-4 border-t border-line py-3">
                      <dt className="eyebrow shrink-0 text-muted">{a.label}</dt>
                      <dd className="text-right">
                        <Value attribute={a} product={p} />
                      </dd>
                    </div>
                  ))}
                </dl>
                <Link to={`/coffee/${p.slug}`} className="label mt-4 inline-flex min-h-11 items-center gap-3 font-medium">
                  Explore <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-body-sm text-faint">Indicative profile. Your cup will vary with grind, method and water.</p>
      </div>
    </section>
  );
}
