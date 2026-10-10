import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { products } from "@/data/products";
import { journal } from "@/data/journal";
import { ease } from "@/lib/motion";
import { track } from "@/lib/analytics";

interface Result {
  to: string;
  title: string;
  meta: string;
}

/** Lowercase and fold curly apostrophes so "doesn't" matches "doesn’t". */
const normalize = (text: string) => text.toLowerCase().replace(/[\u2018\u2019]/g, "'");

const index: (Result & { haystack: string })[] = [
  ...products.map((p) => ({
    to: `/coffee/${p.slug}`,
    title: p.name,
    meta: p.blend,
    haystack: normalize([p.name, p.blend, p.personality.join(" "), p.character, p.shortDescription].join(" ")),
  })),
  ...journal.map((a) => ({
    to: `/journal/${a.slug}`,
    title: a.title,
    meta: `Journal · ${a.category}`,
    haystack: normalize([a.title, a.excerpt, a.category].join(" ")),
  })),
];

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    setQuery("");
    const t = window.setTimeout(() => input.current?.focus(), 120);
    return () => {
      window.clearTimeout(t);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = normalize(query.trim());
    if (!q) return index.slice(0, products.length);
    return index.filter((r) => q.split(/\s+/).every((word) => r.haystack.includes(word)));
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const t = window.setTimeout(() => track("search", { query: q, results: results.length }), 800);
    return () => window.clearTimeout(t);
  }, [query, results.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          className="fixed inset-0 z-[60] overflow-y-auto bg-ink/95 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          <div className="container-site flex h-nav items-center justify-end">
            <button type="button" onClick={onClose} aria-label="Close search" className="grid size-11 place-items-center text-ivory/80 hover:text-ivory">
              <X aria-hidden="true" strokeWidth={1.4} className="size-5" />
            </button>
          </div>

          <motion.div
            className="container-site max-w-4xl! pb-24 pt-[8vh]"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
          >
            <label htmlFor="site-search" className="eyebrow text-muted">
              Search
            </label>
            <input
              ref={input}
              id="site-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Arabica, bold, brewing…"
              className="mt-4 w-full border-b border-line-strong bg-transparent pb-5 font-display text-display-sm font-light text-ivory placeholder:text-faint focus:border-ivory focus:outline-none"
            />

            <p className="eyebrow mt-10 text-faint" aria-live="polite">
              {query.trim() ? `${results.length} result${results.length === 1 ? "" : "s"}` : "The coffee"}
            </p>
            <ul className="mt-4">
              {results.map((r) => (
                <li key={r.to} className="border-b border-line">
                  <Link to={r.to} onClick={onClose} className="group flex items-center justify-between gap-6 py-5">
                    <span>
                      <span className="block font-display text-display-xs transition-colors group-hover:text-accent">{r.title}</span>
                      <span className="label mt-1 block font-medium text-muted">{r.meta}</span>
                    </span>
                    <ArrowRight aria-hidden="true" strokeWidth={1.4} className="size-5 shrink-0 text-muted transition-transform duration-500 group-hover:translate-x-1 group-hover:text-ivory" />
                  </Link>
                </li>
              ))}
            </ul>
            {query.trim() && results.length === 0 && (
              <p className="mt-6 text-muted">Nothing matched. Try “Arabica”, “bold” or “brew”.</p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
