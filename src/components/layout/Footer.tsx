import type { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUp } from "lucide-react";
import { storeEnabled, waitlistEnabled } from "@/config/features";
import { legalNav, primaryNav, site } from "@/config/site";
import { products } from "@/data/products";
import { ShopButton } from "@/components/ui/BuyButton";
import { ExternalLink } from "@/components/ui/ExternalLink";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="eyebrow mb-6 font-sans text-faint">{title}</h2>
      <ul className="flex flex-col gap-3 text-body-sm text-muted">{children}</ul>
    </div>
  );
}

export function Footer({ inert }: { inert?: boolean }) {
  return (
    <footer inert={inert} className="relative overflow-hidden border-t border-line bg-ink pt-section-sm">
      <div className="container-site grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow text-muted">{site.name}</p>
          <p className="mt-6 max-w-sm font-display text-display-sm font-light">{site.tagline}</p>
          {!waitlistEnabled && <ShopButton variant="outline" size="sm" className="mt-10" />}
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 lg:col-span-7">
          <Column title="Navigate">
            {primaryNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="link-underline transition-colors hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </Column>
          {!waitlistEnabled && (
          <Column title="The Coffee">
            {products.map((p) => (
              <li key={p.id}>
                <Link to={`/coffee/${p.slug}`} className="link-underline transition-colors hover:text-ivory">
                  {p.name}
                </Link>
              </li>
            ))}
          </Column>
          )}
          <Column title="Social">
            {site.social.map((s) => (
              <li key={s.label}>
                <ExternalLink href={s.href} className="transition-colors hover:text-ivory">
                  {s.label}
                </ExternalLink>
              </li>
            ))}
          </Column>
          <Column title="Legal">
            {storeEnabled && (
              <li>
                <Link to="/track-order" className="link-underline transition-colors hover:text-ivory">
                  Track Your Order
                </Link>
              </li>
            )}
            {legalNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="link-underline transition-colors hover:text-ivory">
                  {item.label}
                </Link>
              </li>
            ))}
          </Column>
        </div>
      </div>

      <div className="container-site mt-20 flex flex-col gap-4 border-t border-line py-7 text-body-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <a href={`mailto:${site.contactEmail}`} className="link-underline w-fit transition-colors hover:text-ivory">
          {site.contactEmail}
        </a>
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="group inline-flex min-h-11 w-fit items-center gap-2 transition-colors hover:text-ivory"
        >
          Back to top
          <ArrowUp aria-hidden="true" strokeWidth={1.4} className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5" />
        </button>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[12.4vw] font-light uppercase leading-[0.78] tracking-[-0.02em] text-ivory/[0.045]"
      >
        {site.shortName}
      </p>
    </footer>
  );
}
