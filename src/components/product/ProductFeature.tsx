import { productThemeStyle, type CoffeeProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";
import { BuyButton } from "@/components/ui/BuyButton";
import { Meter } from "@/components/ui/Meter";
import { useCoffeeImages } from "@/store/catalog";
import { PriceTag } from "./PriceTag";

/** Large editorial product row used on /coffee. */
export function ProductFeature({ product, index }: { product: CoffeeProduct; index: number }) {
  const flipped = index % 2 === 1;
  const { image } = useCoffeeImages(product);
  return (
    <article
      id={product.slug}
      aria-labelledby={`${product.slug}-name`}
      style={productThemeStyle(product)}
      className="scroll-mt-nav border-t border-line py-section-sm"
    >
      <div className="container-site grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <ImageReveal className={`aspect-[4/5] lg:row-start-1 lg:col-span-6 ${flipped ? "lg:col-start-7" : "lg:col-start-1"}`}>
          <SmartImage asset={image} sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full" />
        </ImageReveal>

        <div className={`lg:row-start-1 lg:col-span-5 ${flipped ? "lg:col-start-1" : "lg:col-start-8"}`}>
          <Reveal variant="fadeIn">
            <p className="flex items-baseline gap-5">
              <span className="font-display text-6xl font-light leading-none text-accent">{product.number}</span>
              <span className="eyebrow text-muted">{product.blend}</span>
            </p>
          </Reveal>
          <RevealText id={`${product.slug}-name`} lines={[product.name]} className="mt-8 text-display-md font-light uppercase" />
          <Reveal delay={0.1}>
            <p className="mt-6 font-display text-display-xs italic text-ivory/90">{product.tagline}</p>
            <p className="mt-5 max-w-md text-muted">{product.description}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8 grid max-w-md grid-cols-[6.5rem_1fr] items-center gap-x-4 gap-y-4 border-y border-line py-6">
              <span className="eyebrow text-faint">Character</span>
              <span className="eyebrow text-accent">{product.personality.join(" / ")}</span>
              <span className="eyebrow text-faint">Intensity</span>
              <Meter value={product.intensity} label="Intensity" />
            </div>
            <PriceTag slug={product.slug} className="mt-6" />
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={`/coffee/${product.slug}`} cursor="Explore">
                Explore {product.name}
              </ButtonLink>
              <BuyButton product={product} variant="outline" compact />
            </div>
          </Reveal>
        </div>
      </div>
    </article>
  );
}
