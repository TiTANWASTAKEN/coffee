import type { StoreProduct } from "@shared/store";
import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { useCart } from "@/store/cart";

interface AddToCartButtonProps {
  product: StoreProduct;
  quantity?: number;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function AddToCartButton({ product, quantity = 1, variant = "primary", size = "md", className = "" }: AddToCartButtonProps) {
  const cart = useCart();
  if (product.stock === 0) {
    return (
      <button type="button" disabled className={`${buttonClasses("outline", size, className)} border-dashed! text-muted! before:hidden`}>
        Sold out
      </button>
    );
  }
  return (
    <Button variant={variant} size={size} cursor="Add" className={className} onClick={() => cart.add(product, quantity)}>
      Add to cart<span className="sr-only"> {product.name}</span>
    </Button>
  );
}
