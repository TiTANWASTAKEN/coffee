import { storeEnabled } from "@/config/features";
import { site } from "@/config/site";
import type { CoffeeProduct } from "@/data/products";
import { amazonHref } from "@/lib/links";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { useCatalog, useStoreProduct } from "@/store/catalog";
import { useCart } from "@/store/cart";
import { Button, buttonClasses, ButtonAnchor, ButtonLink, type ButtonSize, type ButtonVariant } from "./Button";

interface BuyButtonProps {
  product: CoffeeProduct;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Compact drops the price from the label for tight layouts. */
  compact?: boolean;
  className?: string;
}

/**
 * The only place a purchase button is rendered. Adds the coffee to the cart
 * using live price and stock from the store API. If the store is switched off
 * or the coffee isn't in the store database, falls back to its Amazon link
 * (or a disabled state).
 */
function DisabledButton({ text, srPrefix, title, size, className }: { text: string; srPrefix?: string; title?: string; size: ButtonSize; className: string }) {
  return (
    <button
      type="button"
      disabled
      title={title}
      className={`${buttonClasses("outline", size, className)} border-dashed! border-line-strong! text-muted! before:hidden`}
    >
      {srPrefix && <span className="sr-only">{srPrefix}: </span>}
      {text}
    </button>
  );
}

/** Brand-level "Shop" button: the direct shop when the store is on, otherwise the Amazon brand store. */
export function ShopButton({ variant = "primary", size = "md", className = "" }: Pick<BuyButtonProps, "variant" | "size" | "className">) {
  if (storeEnabled) {
    return (
      <ButtonLink to="/shop" variant={variant} size={size} cursor="Shop" className={className}>
        Shop now
      </ButtonLink>
    );
  }

  const href = amazonHref(site.brandAmazonUrl);
  if (!href) return <DisabledButton text="Amazon listing coming soon" size={size} className={className} />;

  return (
    <ButtonAnchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant}
      size={size}
      cursor="Shop"
      className={className}
      onClick={() => track("buy_click", { channel: "amazon" })}
    >
      Shop on Amazon
      <span className="sr-only"> (opens in a new tab)</span>
    </ButtonAnchor>
  );
}

export function BuyButton({ product, label = "Add to cart", variant = "primary", size = "md", compact = false, className = "" }: BuyButtonProps) {
  const { status } = useCatalog();
  const storeProduct = useStoreProduct(product.slug);
  const cart = useCart();

  const disabled = (text: string, title?: string) => <DisabledButton text={text} srPrefix={product.name} title={title} size={size} className={className} />;

  if (status === "loading") return disabled("Loading…");

  if (storeProduct) {
    if (storeProduct.stock === 0) return disabled("Sold out");
    return (
      <Button
        variant={variant}
        size={size}
        cursor="Add"
        className={className}
        onClick={() => {
          track("buy_click", { product: product.slug });
          cart.add(storeProduct);
        }}
      >
        {compact ? label : `${label} — ${formatPrice(storeProduct.price)}`}
        {!label.includes(product.name) && <span className="sr-only"> {product.name}</span>}
      </Button>
    );
  }

  const href = amazonHref(product.amazonUrl);
  if (!href) return disabled(compact ? "Coming soon" : "Available soon", "Not available yet");

  return (
    <ButtonAnchor
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      variant={variant}
      size={size}
      cursor="Shop"
      className={className}
      onClick={() => track("buy_click", { product: product.slug, channel: "amazon" })}
    >
      Buy on Amazon
      <span className="sr-only"> {product.name} (opens in a new tab)</span>
    </ButtonAnchor>
  );
}
