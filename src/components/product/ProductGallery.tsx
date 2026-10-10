import type { CoffeeProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal } from "@/components/motion/Reveal";
import { useCoffeeImages } from "@/store/catalog";

const layout = [
  "md:col-span-5 aspect-[4/5]",
  "md:col-span-4 md:mt-28 aspect-[4/5]",
  "md:col-span-3 md:self-end aspect-[3/4]",
];

export function ProductGallery({ product }: { product: CoffeeProduct }) {
  const { gallery } = useCoffeeImages(product);
  return (
    <section aria-labelledby="gallery-heading" className="pb-section">
      <div className="container-site">
        <Reveal variant="fadeIn" className="mb-10 flex items-baseline justify-between border-t border-line pt-6">
          <h2 id="gallery-heading" className="eyebrow font-sans text-muted">
            Gallery
          </h2>
          <span className="eyebrow text-faint">{String(gallery.length).padStart(2, "0")} images</span>
        </Reveal>
        <ul className="no-scrollbar -mx-gutter flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-gutter px-gutter md:mx-0 md:grid md:grid-cols-12 md:overflow-visible md:px-0">
          {gallery.map((asset, i) => (
            <li key={asset.src} className={`w-[78%] shrink-0 snap-start md:w-auto ${layout[i % layout.length]}`}>
              <ImageReveal className="h-full w-full" parallax={20}>
                <SmartImage asset={asset} sizes="(min-width: 768px) 40vw, 80vw" className="h-full w-full" />
              </ImageReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
