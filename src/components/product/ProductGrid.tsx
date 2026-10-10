import { products } from "@/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { ProductCard } from "./ProductCard";

export function ProductGrid() {
  return (
    <section id="the-three-truths" aria-labelledby="collection-heading" className="scroll-mt-nav py-section">
      <div className="container-site">
        <SectionHeading
          id="collection-heading"
          eyebrow="The Collection"
          title={["The three", "truths"]}
          description="Three coffees. Three distinct expressions."
          aside={
            <ButtonLink to="/coffee" variant="ghost">
              View the collection
            </ButtonLink>
          }
        />
        <Stagger className="mt-14 grid gap-5 md:mt-20 md:grid-cols-3 lg:gap-6" gap={0.12}>
          {products.map((product) => (
            <StaggerItem key={product.id}>
              <ProductCard product={product} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
