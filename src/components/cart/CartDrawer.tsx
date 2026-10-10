import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { getProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { ButtonLink } from "@/components/ui/Button";
import { coverAsset, productHref } from "@/store/catalog";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { ease } from "@/lib/motion";
import { QuantityStepper } from "./QuantityStepper";

export function CartDrawer() {
  const cart = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cart.isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeRef.current?.focus(), 120);
    return () => {
      window.clearTimeout(t);
      trigger?.focus({ preventScroll: true });
    };
  }, [cart.isOpen]);

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <div className="fixed inset-0 z-[60]" onKeyDown={(e) => e.key === "Escape" && cart.close()}>
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease }}
            onClick={cart.close}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Your cart"
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-ink"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.6, ease }}
          >
            <header className="flex h-nav items-center justify-between border-b border-line px-6">
              <h2 className="eyebrow font-sans text-muted">
                Your cart {cart.count > 0 && <span className="text-ivory">({cart.count})</span>}
              </h2>
              <button ref={closeRef} type="button" onClick={cart.close} aria-label="Close cart" className="grid size-11 place-items-center text-ivory/80 hover:text-ivory">
                <X aria-hidden="true" strokeWidth={1.4} className="size-5" />
              </button>
            </header>

            {cart.lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
                <p className="font-display text-display-xs font-light">{cart.ready ? "Your cart is empty." : "Loading…"}</p>
                <ButtonLink to="/shop" variant="outline" size="sm" onClick={cart.close}>
                  Browse the shop
                </ButtonLink>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-6">
                  {cart.lines.map(({ product, quantity }) => (
                    <li key={product.id} className="flex gap-4 border-b border-line py-5">
                      <Link to={productHref(product)} onClick={cart.close} className="block w-20 shrink-0">
                        <SmartImage asset={coverAsset(product, getProduct(product.slug)?.image)} className="aspect-[4/5] w-full" showTag={false} />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <Link to={productHref(product)} onClick={cart.close} className="font-display text-xl uppercase leading-tight tracking-[0.02em] hover:text-accent">
                            {product.name}
                          </Link>
                          <p className="text-body-sm tabular-nums">{formatPrice(product.price * quantity)}</p>
                        </div>
                        <p className="text-body-sm text-muted">{formatPrice(product.price)} each</p>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <QuantityStepper value={quantity} max={product.stock} label={product.name} onChange={(q) => cart.setQuantity(product.id, q)} />
                          <button type="button" onClick={() => cart.remove(product.id)} className="label text-faint transition-colors hover:text-ivory">
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <footer className="border-t border-line px-6 py-6">
                  <div className="flex items-baseline justify-between">
                    <span className="eyebrow text-muted">Subtotal</span>
                    <span className="font-display text-display-xs tabular-nums">{formatPrice(cart.subtotal)}</span>
                  </div>
                  <p className="mt-2 text-body-sm text-faint">Paid securely with Razorpay at checkout.</p>
                  <ButtonLink to="/checkout" size="lg" className="mt-6 w-full" onClick={cart.close} cursor="Checkout">
                    Checkout
                  </ButtonLink>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
