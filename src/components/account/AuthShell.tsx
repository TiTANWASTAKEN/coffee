import type { ReactNode } from "react";
import { PageTransition } from "@/components/layout/PageTransition";

/** Narrow, centred layout for sign-in / sign-up / password pages. */
export function AuthShell({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <PageTransition>
      <section className="container-site flex min-h-[100svh] justify-center pb-section pt-[calc(var(--spacing-nav)_+_4rem)]">
        <div className="w-full max-w-md">
          <p className="eyebrow flex items-center gap-4 text-muted">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            {eyebrow}
          </p>
          <h1 className="mt-6 text-display-md font-light uppercase">{title}</h1>
          {intro && <p className="mt-6 text-muted">{intro}</p>}
          <div className="mt-12">{children}</div>
        </div>
      </section>
    </PageTransition>
  );
}

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(value: string | null, fallback = "/account"): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
