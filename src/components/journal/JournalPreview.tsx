import { journal } from "@/data/journal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { JournalCard } from "./JournalCard";

export function JournalPreview() {
  return (
    <section aria-labelledby="journal-heading" className="border-t border-line py-section">
      <div className="container-site">
        <SectionHeading
          id="journal-heading"
          eyebrow="Journal"
          title={["Notes on", "coffee"]}
          description="Short reads on beans, blends and brewing. Without the jargon."
          aside={
            <ButtonLink to="/journal" variant="ghost">
              All entries
            </ButtonLink>
          }
        />
        <Stagger
          as="ul"
          gap={0.1}
          className="no-scrollbar -mx-gutter mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-gutter px-gutter md:mx-0 md:mt-20 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-14 md:overflow-visible md:px-0 lg:grid-cols-4"
        >
          {journal.slice(0, 4).map((article) => (
            <StaggerItem as="li" key={article.slug} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
              <JournalCard article={article} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
