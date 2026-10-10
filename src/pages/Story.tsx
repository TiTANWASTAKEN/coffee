import { assets } from "@/config/assets";
import { site } from "@/config/site";
import { principles } from "@/data/story";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";
import { VisualStory } from "@/components/sections/VisualStory";
import { Marquee } from "@/components/sections/Marquee";
import { AmazonCTA } from "@/components/sections/AmazonCTA";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function Story() {
  useDocumentTitle("Our story");
  return (
    <PageTransition>
      <PageHeader
        eyebrow="Our story"
        title={["The truth", "about coffee."]}
        intro="Coffee has collected a lot of theatre. We’d like to hand some of it back."
      />

      <div className="container-site">
        <ImageReveal className="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]" parallax={60}>
          <SmartImage asset={assets.story.manifesto} priority className="h-full w-full" />
        </ImageReveal>
      </div>

      <section aria-labelledby="manifesto-heading" className="py-section">
        <div className="container-site grid gap-12 lg:grid-cols-12 lg:gap-8">
          <Reveal variant="fadeIn" className="lg:col-span-3">
            <p className="eyebrow text-muted lg:pt-5">The idea</p>
          </Reveal>
          <div className="lg:col-span-9">
            <RevealText
              id="manifesto-heading"
              lines={["Coffee should be", "what it says it is."]}
              className="text-display-md font-light"
            />
            <div className="mt-14 grid gap-8 text-muted md:grid-cols-2 md:gap-12">
              <Reveal>
                <p className="text-lead">
                  No mystique. No costume. {site.name} is three coffees, each clear about what it is and what it isn’t.
                </p>
              </Reveal>
              <Reveal delay={0.1}>
                <p className="text-lead">
                  Different beans make different cups. Rather than pretend one is right for everyone, we let each one keep its own personality — and let you choose.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="border-t border-line py-section">
        <div className="container-site">
          <Reveal variant="fadeIn">
            <h2 id="principles-heading" className="eyebrow font-sans text-muted">
              What we stand by
            </h2>
          </Reveal>
          <Stagger as="ol" className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2" gap={0.1}>
            {principles.map((p, i) => (
              <StaggerItem as="li" key={p.title} className="flex flex-col bg-ink p-8 md:min-h-[22rem] md:p-12">
                <span className="font-display text-5xl font-light text-accent">0{i + 1}</span>
                <h3 className="mt-10 font-display text-display-sm font-light md:mt-auto">{p.title}</h3>
                <p className="mt-4 max-w-sm text-muted">{p.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <Marquee />
      <VisualStory />

      <section aria-label="Statement" className="border-t border-line py-section">
        <div className="container-site text-center">
          <RevealText
            as="p"
            lines={["Three coffees.", "Three personalities.", <em key="n" className="text-accent">Nothing hidden.</em>]}
            className="text-display-lg font-light uppercase"
          />
        </div>
      </section>

      <AmazonCTA />
    </PageTransition>
  );
}
