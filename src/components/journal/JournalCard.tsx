import { Link } from "react-router";
import type { JournalArticle } from "@/data/journal";
import { SmartImage } from "@/components/media/SmartImage";

interface JournalCardProps {
  article: JournalArticle;
  headingLevel?: "h2" | "h3";
  aspect?: string;
}

export function JournalCard({ article, headingLevel: Heading = "h3", aspect = "aspect-[4/5]" }: JournalCardProps) {
  return (
    <article className="group h-full">
      <Link to={`/journal/${article.slug}`} data-cursor="Read" className="block">
        <div className={`relative overflow-hidden ${aspect}`}>
          <SmartImage
            asset={article.cover}
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 85vw"
            className="h-full w-full"
            imgClassName="transition-transform duration-[1400ms] ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
          />
        </div>
        <p className="eyebrow mt-6 flex items-center gap-3 text-muted">
          {article.category}
          <span aria-hidden="true" className="h-px w-4 bg-line-strong" />
          <span className="text-faint">{article.readingTime}</span>
        </p>
        <Heading className="mt-3 font-display text-display-xs font-light">
          <span className="link-underline group-hover:bg-[length:100%_1px] group-hover:bg-left-bottom">{article.title}</span>
        </Heading>
        <p className="mt-3 line-clamp-2 text-body-sm text-muted">{article.excerpt}</p>
      </Link>
    </article>
  );
}
