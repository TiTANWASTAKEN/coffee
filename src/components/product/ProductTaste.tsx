import type { CoffeeProduct } from "@/data/products";
import { Meter } from "@/components/ui/Meter";
import { Reveal } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";

export function ProductTaste({ product }: { product: CoffeeProduct }) {
  const scales = [
    { label: "Intensity", value: product.intensity },
    { label: "Body", value: product.profile.body },
    { label: "Aroma", value: product.profile.aroma },
    { label: "Balance", value: product.profile.balance },
  ];
  const facts = [
    { label: "Character", value: product.character },
    { label: "Best for", value: product.bestFor },
    { label: "Tasting notes", value: product.tastingNotes.length ? product.tastingNotes.join(", ") : null },
  ];

  return (
    <section id="taste" aria-labelledby="taste-heading" className="scroll-mt-nav border-t border-line py-section">
      <div className="container-site grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <Reveal variant="fadeIn">
            <p className="eyebrow flex items-center gap-4 text-muted">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              Taste profile
            </p>
          </Reveal>
          <h2 id="taste-heading" className="sr-only">
            Taste profile
          </h2>
          <RevealText
            as="p"
            stagger={0.12}
            className="mt-8 text-display-lg font-light uppercase"
            lines={product.personality.map((trait, i) => (
              <span key={trait} className={i === 1 ? "italic normal-case text-accent" : ""}>
                {i === 1 ? trait.toLowerCase() : trait}.
              </span>
            ))}
          />
        </div>

        <Reveal className="lg:col-span-5 lg:col-start-8 lg:pt-16">
          <dl className="border-b border-line">
            {scales.map((s, i) => (
              <div key={s.label} className="border-t border-line py-5">
                <div className="flex items-baseline justify-between">
                  <dt className="eyebrow text-muted">{s.label}</dt>
                  <dd className="font-display text-lg text-ivory/80">
                    {s.value}
                    <span className="text-faint">/5</span>
                  </dd>
                </div>
                <Meter value={s.value} label={s.label} variant="bars" className="mt-4" delay={0.2 + i * 0.08} />
              </div>
            ))}
            {facts.map((f) => (
              <div key={f.label} className="grid grid-cols-[8rem_1fr] gap-4 border-t border-line py-5">
                <dt className="eyebrow pt-1 text-muted">{f.label}</dt>
                <dd className={f.value ? "text-ivory/85" : "italic text-faint"}>{f.value ?? "To be confirmed"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-body-sm text-faint">Indicative profile. Your cup will vary with grind, method and water.</p>
        </Reveal>
      </div>
    </section>
  );
}
