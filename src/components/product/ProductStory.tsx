import type { CoffeeProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";

export function ProductStory({ product }: { product: CoffeeProduct }) {
  return (
    <section aria-labelledby="product-story-heading" className="py-section">
      <div className="container-site grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <ImageReveal className="aspect-[4/5] sm:aspect-[4/3] lg:col-span-7">
          <SmartImage asset={product.heroImage} sizes="(min-width: 1024px) 58vw, 100vw" className="h-full w-full" />
        </ImageReveal>
        <div className="lg:col-span-4 lg:col-start-9">
          <Reveal variant="fadeIn">
            <p className="eyebrow flex items-center gap-4 text-muted">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              The story
            </p>
          </Reveal>
          <RevealText id="product-story-heading" lines={[product.story.heading]} className="mt-7 text-display-sm font-light" />
          {product.story.paragraphs.map((text, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08}>
              <p className="mt-6 text-muted">{text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
