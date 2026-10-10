import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StoreProduct } from "@shared/store";
import { track } from "@/lib/analytics";
import { useCatalog } from "./catalog";

const STORAGE_KEY = "ht-cart";
const MAX_PER_ITEM = 99;

interface StoredLine {
  productId: number;
  quantity: number;
}

export interface CartLine {
  product: StoreProduct;
  quantity: number;
}

interface CartValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: StoreProduct, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

function load(): StoredLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((l) => Number.isInteger(l?.productId) && Number.isInteger(l?.quantity) && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog();
  const [stored, setStored] = useState<StoredLine[]>(load);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [stored]);

  // Keep tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setStored(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Once live data is in, drop products that no longer exist and respect stock.
  const lines = useMemo<CartLine[]>(() => {
    if (catalog.status !== "ready") return [];
    return stored.flatMap(({ productId, quantity }) => {
      const product = catalog.byId(productId);
      if (!product || product.stock === 0) return [];
      return [{ product, quantity: Math.min(quantity, product.stock) }];
    });
  }, [stored, catalog]);

  const add = useCallback((product: StoreProduct, quantity = 1) => {
    setStored((current) => {
      const existing = current.find((l) => l.productId === product.id);
      const limit = Math.min(product.stock, MAX_PER_ITEM);
      if (existing) return current.map((l) => (l.productId === product.id ? { ...l, quantity: Math.min(l.quantity + quantity, limit) } : l));
      return [...current, { productId: product.id, quantity: Math.min(quantity, limit) }];
    });
    setIsOpen(true);
    track("add_to_cart", { product: product.slug, quantity });
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setStored((current) =>
      quantity <= 0
        ? current.filter((l) => l.productId !== productId)
        : current.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(quantity, MAX_PER_ITEM) } : l)),
    );
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const clear = useCallback(() => setStored([]), []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
      ready: catalog.status !== "loading",
      isOpen,
      open,
      close,
      add,
      setQuantity,
      remove: (productId) => setQuantity(productId, 0),
      clear,
    }),
    [lines, catalog.status, isOpen, open, close, add, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
