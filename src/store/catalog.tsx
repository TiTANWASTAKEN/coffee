import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { StoreProduct } from "@shared/store";
import type { ImageAsset, Tone } from "@/config/assets";
import { storeEnabled } from "@/config/features";
import { getProduct, products as coffeeOrder, type CoffeeProduct } from "@/data/products";
import { api } from "@/lib/api";

type Status = "loading" | "ready" | "error";

interface CatalogValue {
  status: Status;
  products: StoreProduct[];
  bySlug: (slug: string | undefined) => StoreProduct | undefined;
  byId: (id: number) => StoreProduct | undefined;
  refresh: () => Promise<void>;
}

const CatalogContext = createContext<CatalogValue | null>(null);

/** Live prices, stock and images from the API. Product copy still lives in src/data. Empty while the store is switched off. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(storeEnabled ? "loading" : "ready");
  const [products, setProducts] = useState<StoreProduct[]>([]);

  const refresh = useCallback(async () => {
    if (!storeEnabled) return;
    try {
      const list = await api<StoreProduct[]>("/products");
      const rank = new Map(coffeeOrder.map((coffee, index) => [coffee.slug, index]));
      list.sort((a, b) => (rank.get(a.slug) ?? 99) - (rank.get(b.slug) ?? 99));
      setProducts(list);
      setStatus("ready");
    } catch {
      setStatus((s) => (s === "ready" ? s : "error"));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<CatalogValue>(() => {
    const slugs = new Map(products.map((p) => [p.slug, p]));
    const ids = new Map(products.map((p) => [p.id, p]));
    return {
      status,
      products,
      bySlug: (slug) => (slug ? slugs.get(slug) : undefined),
      byId: (id) => ids.get(id),
      refresh,
    };
  }, [status, products, refresh]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}

export function useStoreProduct(slug: string | undefined): StoreProduct | undefined {
  return useCatalog().bySlug(slug);
}

/** Coffees with editorial pages live under /coffee; everything else uses the generic shop page. */
export function productHref(product: Pick<StoreProduct, "slug">): string {
  return getProduct(product.slug) ? `/coffee/${product.slug}` : `/shop/${product.slug}`;
}

/** An uploaded image as an ImageAsset, so it can go through SmartImage. */
export function uploadedAsset(src: string, alt: string, tone: Tone = "neutral"): ImageAsset {
  return { src, ready: true, alt, placeholder: { label: alt, variant: "packshot", tone } };
}

/**
 * A coffee's packshot and gallery, with images uploaded in the admin taking
 * priority over the files registered in config/assets.ts.
 */
export function useCoffeeImages(product: CoffeeProduct): { image: ImageAsset; gallery: ImageAsset[] } {
  const uploaded = useStoreProduct(product.slug)?.images ?? [];
  const tone = product.theme.tone;
  return {
    image: uploaded[0] ? uploadedAsset(uploaded[0], `${product.name} coffee bag`, tone) : product.image,
    gallery: uploaded.length > 1 ? uploaded.slice(1).map((src) => uploadedAsset(src, product.name, tone)) : product.gallery,
  };
}

/** Cover image for a store product, falling back to a designed placeholder. */
export function coverAsset(product: StoreProduct, fallback?: ImageAsset): ImageAsset {
  if (product.images[0]) return uploadedAsset(product.images[0], product.name, fallback?.placeholder.tone);
  return fallback ?? { src: "", ready: false, alt: product.name, placeholder: { label: product.name, variant: "packshot", tone: "neutral" } };
}
