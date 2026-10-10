import { useParams } from "react-router";
import { getProduct, products, productThemeStyle } from "@/data/products";
import { PageTransition } from "@/components/layout/PageTransition";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductTaste } from "@/components/product/ProductTaste";
import { ProductStory } from "@/components/product/ProductStory";
import { ProductDetails } from "@/components/product/ProductDetails";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductCTA } from "@/components/product/ProductCTA";
import { ProductCard } from "@/components/product/ProductCard";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import NotFound from "./NotFound";

export default function Product() {
  const { slug } = useParams();
  const product = getProduct(slug);
  useDocumentTitle(product ? `${product.name} — ${product.blend}` : undefined);

  if (!product) return <NotFound />;

  const others = products.filter((p) => p.id !== product.id);

  return (
    <PageTransition>
      <div style={productThemeStyle(product)}>
        <ProductHero product={product} />
        <ProductTaste product={product} />
        <ProductStory product={product} />
        <ProductDetails product={product} />
        <ProductGallery product={product} />
        <ProductCTA product={product} />
      </div>

      <section aria-labelledby="others-heading" className="border-t border-line py-section">
        <div className="container-site">
          <SectionHeading id="others-heading" eyebrow="Keep exploring" title={["The other", "truths"]} />
          <Stagger className="mt-14 grid gap-5 md:mt-20 md:grid-cols-2 lg:gap-6" gap={0.12}>
            {others.map((p) => (
              <StaggerItem key={p.id}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <div style={productThemeStyle(product)}>
        <StickyBuyBar product={product} />
      </div>
    </PageTransition>
  );
}
