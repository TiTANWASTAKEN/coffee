import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getArticle, journal, type JournalBlock } from "@/data/journal";
import { PageTransition } from "@/components/layout/PageTransition";
import { SmartImage } from "@/components/media/SmartImage";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { RevealText } from "@/components/motion/RevealText";
import { Reveal } from "@/components/motion/Reveal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ease } from "@/lib/motion";
import NotFound from "./NotFound";

function Block({ block }: { block: JournalBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 className="mb-5 mt-16 text-display-xs font-normal">{block.text}</h2>;
    case "quote":
      return (
        <blockquote className="my-14 border-l border-accent pl-6 font-display text-display-sm font-light italic text-ivory md:-ml-6">
          {block.text}
        </blockquote>
      );
    case "list":
      return (
        <ul className="my-8 flex flex-col gap-3">
          {block.items.map((item) => (
            <li key={item} className="grid grid-cols-[1.5rem_1fr] text-ivory/85">
              <span aria-hidden="true" className="mt-[0.85em] h-px w-3 bg-accent" />
              {item}
            </li>
          ))}
        </ul>
      );
    default:
      return <p className="mb-6 text-[1.0625rem] leading-[1.85] text-ivory/80">{block.text}</p>;
  }
}

export default function JournalArticle() {
  const { slug } = useParams();
  const article = getArticle(slug);
  useDocumentTitle(article?.title);

  if (!article) return <NotFound />;

  const index = journal.findIndex((a) => a.slug === article.slug);
  const next = journal[(index + 1) % journal.length];

  return (
    <PageTransition>
      <article>
        <header className="container-site max-w-5xl! pt-[calc(var(--spacing-nav)_+_clamp(3rem,8vw,7rem))] text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease }}>
            <Link to="/journal" className="group label inline-flex min-h-11 items-center gap-3 font-medium text-muted transition-colors hover:text-ivory">
              <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-4 transition-transform duration-500 group-hover:-translate-x-1" />
              Journal
            </Link>
            <p className="eyebrow mt-8 flex items-center justify-center gap-3 text-muted">
              {article.category}
              <span aria-hidden="true" className="h-px w-4 bg-line-strong" />
              <span className="text-faint">{article.readingTime}</span>
              {article.date && (
                <>
                  <span aria-hidden="true" className="h-px w-4 bg-line-strong" />
                  <time dateTime={article.date} className="text-faint">
                    {new Date(article.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </time>
                </>
              )}
            </p>
          </motion.div>
          <RevealText as="h1" play delay={0.1} lines={[article.title]} className="mt-8 text-display-lg font-light" />
          <motion.p
            className="mx-auto mt-8 max-w-xl text-lead text-muted"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.35 }}
          >
            {article.excerpt}
          </motion.p>
        </header>

        <div className="container-site mt-16 md:mt-24">
          <ImageReveal className="aspect-[4/3] md:aspect-[21/9]" parallax={50}>
            <SmartImage asset={article.cover} priority className="h-full w-full" />
          </ImageReveal>
        </div>

        <Reveal className="container-site max-w-[calc(var(--container-prose)_+_2_*_var(--spacing-gutter))]! py-section-sm">
          {article.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </Reveal>
      </article>

      <aside aria-label="Next article" className="border-t border-line">
        <Link to={`/journal/${next.slug}`} className="group container-site flex flex-col gap-6 py-section-sm md:flex-row md:items-end md:justify-between">
          <span>
            <span className="eyebrow block text-muted">Next read</span>
            <span className="mt-5 block font-display text-display-md font-light transition-colors duration-500 group-hover:text-accent">{next.title}</span>
          </span>
          <span className="grid size-16 shrink-0 place-items-center rounded-full border border-line-strong transition-colors duration-500 group-hover:border-ivory group-hover:bg-ivory group-hover:text-ink">
            <ArrowRight aria-hidden="true" strokeWidth={1.3} className="size-5 transition-transform duration-500 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </aside>
    </PageTransition>
  );
}
