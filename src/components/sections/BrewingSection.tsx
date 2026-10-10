import { Fragment } from "react";
import { Link } from "react-router";
import { brewMethods } from "@/data/brewing";
import { getProduct } from "@/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { BrewIcon } from "./BrewIcon";

export function BrewingSection() {
  return (
    <section id="ritual" aria-labelledby="ritual-heading" className="scroll-mt-nav border-t border-line py-section">
      <div className="container-site">
        <SectionHeading
          id="ritual-heading"
          eyebrow="Brewing"
          title={["Make it", "your ritual"]}
          description="Three ways in. Not rules — just a good place to start."
        />

        <Stagger className="mt-16 grid gap-px border border-line bg-line md:mt-20 md:grid-cols-3" gap={0.12}>
          {brewMethods.map((m, i) => (
            <StaggerItem key={m.id} className="group flex flex-col bg-ink p-7 transition-colors duration-700 hover:bg-surface md:min-h-[34rem] md:p-8 lg:p-10">
              <div className="flex items-start justify-between">
                <span className="eyebrow text-faint">0{i + 1}</span>
                <BrewIcon method={m.id} className="size-14 text-ivory/60 transition-colors duration-700 group-hover:text-beige" />
              </div>

              <h3 className="mt-14 font-display text-display-sm font-light md:mt-auto">{m.name}</h3>
              <p className="mt-3 font-display text-xl italic text-ivory/85">{m.line}</p>
              <p className="mt-4 text-body-sm text-muted">{m.description}</p>

              <p className="mt-6 text-body-sm text-muted">
                <span className="eyebrow mr-3 text-faint">Best with</span>
                {m.bestWith.map((slug, j) => {
                  const product = getProduct(slug);
                  if (!product) return null;
                  return (
                    <Fragment key={slug}>
                      {j > 0 && <span className="text-faint"> · </span>}
                      <Link to={`/coffee/${slug}`} className="link-underline text-ivory/90">
                        {product.name}
                      </Link>
                    </Fragment>
                  );
                })}
              </p>

              <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-5">
                {m.guidance.map((g) => (
                  <div key={g.label}>
                    <dt className="eyebrow text-faint">{g.label}</dt>
                    <dd className="mt-2 text-body-sm text-ivory/85">{g.value}</dd>
                  </div>
                ))}
              </dl>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-8 text-body-sm text-faint">General guidance only. Adjust grind, dose and time to your taste.</p>
      </div>
    </section>
  );
}
