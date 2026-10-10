import { assets } from "@/config/assets";
import { principles } from "@/data/story";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";

/** Home-page brand story teaser: "The truth about coffee". */
export function StorySection() {
  return (
    <section aria-labelledby="story-heading" className="border-t border-line py-section">
      <div className="container-site grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <Reveal variant="fadeIn">
            <p className="eyebrow flex items-center gap-4 text-muted">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              Our story
            </p>
          </Reveal>
          <RevealText id="story-heading" lines={["The truth", "about coffee"]} className="mt-6 text-display-lg font-light uppercase" />
          <ImageReveal className="mt-14 aspect-[4/3] lg:mt-20">
            <SmartImage asset={assets.story.manifesto} sizes="(min-width: 1024px) 50vw, 100vw" className="h-full w-full" />
          </ImageReveal>
        </div>

        <div className="flex flex-col justify-end lg:col-span-5 lg:col-start-8">
          <Reveal>
            <p className="text-lead text-ivory/85">
              Coffee has collected a lot of theatre. We’d like to hand some of it back — and let the cup speak for itself.
            </p>
          </Reveal>
          <Stagger as="ol" className="mt-12 border-b border-line" gap={0.1}>
            {principles.map((p, i) => (
              <StaggerItem as="li" key={p.title} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-line py-6">
                <span className="eyebrow pt-2 text-faint">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-display-xs">{p.title}</h3>
                  <p className="mt-2 text-body-sm text-muted">{p.text}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
          <Reveal delay={0.2}>
            <ButtonLink to="/story" variant="ghost" className="mt-10">
              Read our story
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
