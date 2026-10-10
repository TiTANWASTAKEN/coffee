import { reviews } from "@/data/reviews";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

/** Shows genuine reviews from data/reviews.ts, or an honest empty state. */
export function Reviews() {
  return (
    <section aria-labelledby="reviews-heading" className="border-t border-line py-section-sm">
      <div className="container-site flex flex-col items-center text-center">
        <Reveal variant="fadeIn">
          <p className="eyebrow flex items-center gap-4 text-muted">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            What people say
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
          </p>
        </Reveal>

        {reviews.length > 0 ? (
          <>
            <h2 id="reviews-heading" className="sr-only">
              Customer reviews
            </h2>
            <Stagger className="mt-14 grid w-full gap-px border border-line bg-line text-left md:grid-cols-3">
              {reviews.map((r, i) => (
                <StaggerItem key={i} className="bg-ink p-8 md:p-10">
                  <figure>
                    <blockquote className="font-display text-display-xs font-light">“{r.quote}”</blockquote>
                    <figcaption className="mt-8 text-body-sm text-muted">
                      {r.author}
                      {r.source && <span className="eyebrow mt-1 block text-faint">{r.source}</span>}
                    </figcaption>
                  </figure>
                </StaggerItem>
              ))}
            </Stagger>
          </>
        ) : (
          <Reveal className="mt-10 flex flex-col items-center">
            <span aria-hidden="true" className="font-display text-[7rem] leading-[0.6] text-accent/50">
              “
            </span>
            <h2 id="reviews-heading" className="mt-6 text-display-sm font-light">
              Customer reviews coming soon.
            </h2>
            <p className="mt-5 max-w-md text-muted">We’d rather wait for real ones than write our own.</p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
