import type { ComponentProps } from "react";
import type { CoffeeProduct } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { useCoffeeImages } from "@/store/catalog";

/** A coffee's packshot — the admin-uploaded cover if there is one. */
export function CoffeeImage({ product, ...props }: { product: CoffeeProduct } & Omit<ComponentProps<typeof SmartImage>, "asset">) {
  const { image } = useCoffeeImages(product);
  return <SmartImage asset={image} {...props} />;
}
