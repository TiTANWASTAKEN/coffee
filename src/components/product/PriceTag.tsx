import { formatPrice } from "@/lib/format";
import { useStoreProduct } from "@/store/catalog";

const LOW_STOCK = 5;

/** Live price + stock line for a coffee. Renders nothing until the catalogue has loaded. */
export function PriceTag({ slug, className = "" }: { slug: string; className?: string }) {
  const product = useStoreProduct(slug);
  if (!product) return null;

  const stock =
    product.stock === 0 ? "Coming soon" : product.stock <= LOW_STOCK ? `Only ${product.stock} left` : "In stock";

  return (
    <p className={`flex items-baseline gap-4 ${className}`}>
      <span className="font-display text-display-xs tabular-nums">{formatPrice(product.price)}</span>
      <span className={`label font-medium ${product.stock === 0 ? "text-faint" : "text-muted"}`}>{stock}</span>
    </p>
  );
}
