import { Link } from "react-router";
import type { StoreProduct } from "@shared/store";
import { getProduct, productThemeStyle } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { formatPrice } from "@/lib/format";
import { coverAsset, productHref } from "@/store/catalog";
import { AddToCartButton } from "./AddToCartButton";

export function StoreProductCard({ product }: { product: StoreProduct }) {
  const coffee = getProduct(product.slug);
  const href = productHref(product);

  return (
    <article
      style={coffee ? productThemeStyle(coffee) : undefined}
      className="group flex h-full flex-col border border-line bg-surface transition-[background-color,border-color] duration-700 can-hover:hover:border-line-strong can-hover:hover:bg-surface-raised"
    >
      <Link to={href} tabIndex={-1} aria-hidden="true" data-cursor="View" className="relative block aspect-[4/5] overflow-hidden">
        <SmartImage
          asset={coverAsset(product, coffee?.image)}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full"
          imgClassName="transition-transform duration-[1400ms] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
        />
        {coffee && <span className="eyebrow absolute right-5 top-6 text-ivory/60">{coffee.blendShort}</span>}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-display-xs uppercase leading-none tracking-[0.02em]">
            <Link to={href} className="transition-colors hover:text-accent">
              {product.name}
            </Link>
          </h2>
          <p className="shrink-0 tabular-nums">{formatPrice(product.price)}</p>
        </div>
        {product.description && <p className="mt-4 line-clamp-3 text-body-sm text-muted">{product.description}</p>}
        {product.stock > 0 && product.stock <= 5 && <p className="label mt-4 font-medium text-accent">Only {product.stock} left</p>}
        <div className="mt-auto pt-8">
          <AddToCartButton product={product} size="sm" className="w-full" />
        </div>
      </div>
    </article>
  );
}
