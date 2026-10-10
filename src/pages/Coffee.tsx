import { Link } from "react-router";
import { storeEnabled } from "@/config/features";
import { products } from "@/data/products";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProductFeature } from "@/components/product/ProductFeature";
import { ProductComparison } from "@/components/sections/ProductComparison";
import { CoffeeQuiz } from "@/components/sections/CoffeeQuiz";
import { BrewingSection } from "@/components/sections/BrewingSection";
import { AmazonCTA } from "@/components/sections/AmazonCTA";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Coffee() {
  useDocumentTitle("Shop the coffee");
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Shop — The Coffee"
        title={["Three coffees.", "Nothing hidden."]}
        intro={
          storeEnabled
            ? "Choose by personality, not by jargon. Order direct — secure checkout with Razorpay."
            : "Choose by personality, not by jargon. Available on Amazon."
        }
        aside={
          <nav aria-label="Coffees on this page">
            <ol className="border-b border-line">
              {products.map((p) => (
                <li key={p.id} className="border-t border-line">
                  <Link to={`#${p.slug}`} className="group flex min-h-12 items-center justify-between py-3 text-muted transition-colors hover:text-ivory">
                    <span className="flex items-baseline gap-4">
                      <span className="eyebrow text-faint">{p.number}</span>
                      <span className="font-display text-xl">{p.name}</span>
                    </span>
                    <span className="label font-medium text-faint transition-colors group-hover:text-ivory">{p.blendShort}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        }
      />
      <section aria-label="The coffees">
        {products.map((p, i) => (
          <ProductFeature key={p.id} product={p} index={i} />
        ))}
      </section>
      <ProductComparison />
      <CoffeeQuiz />
      <BrewingSection />
      <AmazonCTA />
    </PageTransition>
  );
}
