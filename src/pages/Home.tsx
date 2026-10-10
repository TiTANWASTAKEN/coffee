import { PageTransition } from "@/components/layout/PageTransition";
import { Hero } from "@/components/sections/Hero";
import { IntroStatement } from "@/components/sections/IntroStatement";
import { ProductGrid } from "@/components/product/ProductGrid";
import { Marquee } from "@/components/sections/Marquee";
import { VisualStory } from "@/components/sections/VisualStory";
import { ProductComparison } from "@/components/sections/ProductComparison";
import { CoffeeQuiz } from "@/components/sections/CoffeeQuiz";
import { StorySection } from "@/components/sections/StorySection";
import { BrewingSection } from "@/components/sections/BrewingSection";
import { JournalPreview } from "@/components/journal/JournalPreview";
import { Reviews } from "@/components/sections/Reviews";
import { AmazonCTA } from "@/components/sections/AmazonCTA";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Home() {
  useDocumentTitle();
  return (
    <PageTransition>
      <Hero />
      <IntroStatement />
      <ProductGrid />
      <Marquee />
      <VisualStory />
      <ProductComparison />
      <CoffeeQuiz />
      <StorySection />
      <BrewingSection />
      <JournalPreview />
      <Reviews />
      <AmazonCTA />
    </PageTransition>
  );
}
