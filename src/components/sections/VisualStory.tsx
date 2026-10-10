import { chapters } from "@/data/story";
import { getProduct, productThemeStyle } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";

/** Alternating image/text chapters: Arabica, Robusta, the Blend. */
export function VisualStory() {
  return (
    <section aria-label="The beans" className="py-section">
      <div className="container-site flex flex-col gap-section-sm md:gap-section">
        {chapters.map((chapter, i) => {
          const product = getProduct(chapter.product);
          const flipped = i % 2 === 1;
          return (
            <article
              key={chapter.id}
              id={chapter.id}
              style={product ? productThemeStyle(product) : undefined}
              className="grid items-center gap-10 md:grid-cols-12 md:gap-8"
            >
              <ImageReveal
                className={`aspect-[4/5] md:row-start-1 md:col-span-6 ${flipped ? "md:col-start-7" : "md:col-start-1"}`}
              >
                <SmartImage asset={chapter.image} sizes="(min-width: 768px) 50vw, 100vw" className="h-full w-full" />
              </ImageReveal>

              <div className={`md:row-start-1 md:col-span-5 ${flipped ? "md:col-start-1" : "md:col-start-8"}`}>
                <Reveal variant="fadeIn">
                  <p className="eyebrow flex items-center gap-4 text-muted">
                    <span className="font-display text-lg font-normal normal-case tracking-normal text-accent">{chapter.numeral}</span>
                    <span aria-hidden="true" className="h-px w-8 bg-line-strong" />
                    {chapter.eyebrow}
                  </p>
                </Reveal>
                <RevealText lines={chapter.title} as="h2" className="mt-7 text-display-md font-light" />
                <Reveal delay={0.15}>
                  <p className="mt-8 max-w-md text-lead text-muted">{chapter.body}</p>
                </Reveal>
                {product && (
                  <Reveal delay={0.25}>
                    <ButtonLink to={`/coffee/${product.slug}`} variant="ghost" className="mt-10">
                      Discover {product.name}
                    </ButtonLink>
                  </Reveal>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
