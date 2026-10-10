import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { journal } from "@/data/journal";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { Reveal } from "@/components/motion/Reveal";
import { JournalCard } from "@/components/journal/JournalCard";
import { ButtonLink } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ease } from "@/lib/motion";

const categories = ["All", ...Array.from(new Set(journal.map((a) => a.category)))];

export default function Journal() {
  useDocumentTitle("Journal");
  const [category, setCategory] = useState("All");
  const [featured, ...rest] = journal;
  const list = category === "All" ? rest : journal.filter((a) => a.category === category);

  return (
    <PageTransition>
      <PageHeader eyebrow="Journal" title={["Notes on", "coffee."]} intro="Short reads on beans, blends and brewing. No jargon, no lectures." />

      {category === "All" && featured && (
        <section aria-label="Featured" className="container-site pb-section-sm">
          <article className="group grid items-end gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-8">
            <Link to={`/journal/${featured.slug}`} data-cursor="Read" tabIndex={-1} aria-hidden="true" className="block lg:col-span-7">
              <ImageReveal className="aspect-[4/3] lg:aspect-[16/10]">
                <SmartImage asset={featured.cover} priority className="h-full w-full" imgClassName="transition-transform duration-[1400ms] group-hover:scale-[1.04]" />
              </ImageReveal>
            </Link>
            <Reveal className="lg:col-span-4 lg:col-start-9">
              <p className="eyebrow flex items-center gap-3 text-muted">
                Featured <span aria-hidden="true" className="h-px w-4 bg-line-strong" /> {featured.category}
              </p>
              <h2 className="mt-5 text-display-md font-light">
                <Link to={`/journal/${featured.slug}`} className="transition-colors hover:text-accent">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-5 text-muted">{featured.excerpt}</p>
              <ButtonLink to={`/journal/${featured.slug}`} variant="ghost" className="mt-8">
                Read · {featured.readingTime}
              </ButtonLink>
            </Reveal>
          </article>
        </section>
      )}

      <section aria-label="All entries" className="border-t border-line py-section-sm">
        <div className="container-site">
          <div role="group" aria-label="Filter by category" className="no-scrollbar -mx-gutter flex gap-2 overflow-x-auto px-gutter">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`label min-h-11 shrink-0 border px-5 font-medium transition-colors duration-500 ${
                  category === c ? "border-ivory bg-ivory text-ink" : "border-line-strong text-muted hover:border-ivory hover:text-ivory"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <motion.ul layout className="mt-14 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {list.map((article) => (
                <motion.li
                  key={article.slug}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease }}
                >
                  <JournalCard article={article} headingLevel="h2" />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>
      </section>
    </PageTransition>
  );
}
