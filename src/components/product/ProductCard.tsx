import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { productThemeStyle, type CoffeeProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { ButtonLink } from "@/components/ui/Button";
import { BuyButton } from "@/components/ui/BuyButton";
import { Meter } from "@/components/ui/Meter";
import { useCoffeeImages } from "@/store/catalog";
import { PriceTag } from "./PriceTag";

interface ProductCardProps {
  product: CoffeeProduct;
  headingLevel?: "h2" | "h3";
}

export function ProductCard({ product, headingLevel: Heading = "h3" }: ProductCardProps) {
  const href = `/coffee/${product.slug}`;
  const { image } = useCoffeeImages(product);

  return (
    <article
      style={productThemeStyle(product)}
      className="group relative flex h-full flex-col border border-line bg-surface transition-[translate,background-color,box-shadow,border-color] duration-700 ease-[var(--ease-luxe)] can-hover:hover:-translate-y-1.5 can-hover:hover:border-line-strong can-hover:hover:bg-surface-raised can-hover:hover:shadow-lift"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-px origin-left scale-x-0 bg-accent transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-x-100"
      />

      <Link to={href} tabIndex={-1} aria-hidden="true" data-cursor="View" className="relative block aspect-[4/5] overflow-hidden">
        <SmartImage
          asset={image}
          sizes="(min-width: 768px) 33vw, 100vw"
          className="h-full w-full"
          imgClassName="transition-transform duration-[1400ms] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
        />
        <span className="absolute left-5 top-4 font-display text-2xl font-light text-ivory/80">{product.number}</span>
        <span className="eyebrow absolute right-5 top-6 text-ivory/60">{product.blendShort}</span>
      </Link>

      <div className="flex flex-1 flex-col p-6 md:p-5 lg:p-7">
        <div className="flex items-start justify-between gap-4">
          <Heading className="font-display text-display-xs uppercase leading-none tracking-[0.02em]">
            <Link to={href} className="transition-colors hover:text-accent">
              {product.name}
            </Link>
          </Heading>
          <ArrowUpRight
            aria-hidden="true"
            strokeWidth={1.3}
            className="mt-0.5 size-5 shrink-0 text-muted transition-[translate,color] duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
          />
        </div>
        <p className="label mt-3 font-medium text-muted">{product.blend}</p>
        <p className="eyebrow mt-5 text-accent">{product.personality.join(" / ")}</p>
        <p className="mt-5 text-body-sm text-muted">{product.shortDescription}</p>
        <PriceTag slug={product.slug} className="mt-5" />

        <div className="mt-6 flex items-center gap-4 transition-[opacity,translate] duration-700 ease-[var(--ease-luxe)] can-hover:translate-y-2 can-hover:opacity-0 can-hover:group-hover:translate-y-0 can-hover:group-hover:opacity-100 can-hover:group-focus-within:translate-y-0 can-hover:group-focus-within:opacity-100">
          <span className="eyebrow text-faint">Intensity</span>
          <Meter value={product.intensity} label="Intensity" />
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-8 md:grid-cols-1 xl:grid-cols-2">
          <ButtonLink to={href} variant="outline" size="sm" cursor="Explore" className="w-full px-4!">
            Explore
          </ButtonLink>
          <BuyButton product={product} size="sm" compact className="w-full px-4!" />
        </div>
      </div>
    </article>
  );
}
