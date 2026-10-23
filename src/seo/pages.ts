import { legalNav, site } from "@/config/site";
import { legalCopy } from "@/data/legal";
import { journal } from "@/data/journal";
import { products } from "@/data/products";
import { principles, storyIntro } from "@/data/story";
import { formatPrice } from "@/lib/format";
import { coffeeSlugs, type CoffeeSlug } from "@shared/coffeeSlugs";

/** Public site origin. Canonical URLs and the sitemap use this host. */
export const ORIGIN = "https://bittertruthcoffee.in";

/**
 * Published store price and whether the catalog seed can be bought.
 * Same figures as the product seed in server/db.ts and supabase/store.sql.
 * Honest Truth and Dark Truth are in stock. Bitter Truth starts at stock 0.
 */
const catalog: Record<CoffeeSlug, { pricePaise: number; inStock: boolean }> = {
  "honest-truth": { pricePaise: 49900, inStock: true },
  "dark-truth": { pricePaise: 44900, inStock: true },
  "bitter-truth": { pricePaise: 47900, inStock: false },
};

const productSlugs = products.map((product) => product.slug).sort();
const seededSlugs = [...coffeeSlugs].sort();
if (productSlugs.join() !== seededSlugs.join()) {
  throw new Error(`Product slugs (${productSlugs.join(", ")}) do not match shared/coffeeSlugs.ts.`);
}

export type PublicPage = {
  path: string;
  title: string;
  description: string;
  imagePath: string;
  ogType: "website" | "article";
  lastmod?: string;
  jsonLd?: Record<string, unknown>;
  html: string;
};

function titled(label?: string): string {
  if (!label) return `${site.name} — ${site.tagline.replace(/\.$/, "")}`;
  return `${label} — ${site.name}`;
}

export function canonicalUrl(path: string): string {
  return path === "/" ? `${ORIGIN}/` : `${ORIGIN}${path}`;
}

function abs(src: string): string {
  return `${ORIGIN}${src.startsWith("/") ? src : `/${src}`}`;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function offer(slug: CoffeeSlug) {
  const item = catalog[slug];
  return {
    pricePaise: item.pricePaise,
    price: (item.pricePaise / 100).toFixed(2),
    label: item.inStock ? "In stock" : "Coming soon",
    availability: item.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
  };
}

const instagram = site.social.filter((item) => item.href.startsWith("http")).map((item) => item.href);

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: `${ORIGIN}/`,
  email: site.contactEmail,
  logo: `${ORIGIN}/favicon.svg`,
  sameAs: instagram,
};

const homeDescription =
  "Bitter Truth Coffee. Three coffees, three personalities, nothing hidden. 100% Arabica, 100% Robusta and a 70/30 blend.";

function productJsonLd(product: (typeof products)[number]): Record<string, unknown> {
  const selling = offer(product.slug as CoffeeSlug);
  const confirmed = product.details.filter((detail) => detail.value);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.slug,
    image: abs(product.image.src),
    url: canonicalUrl(`/coffee/${product.slug}`),
    brand: { "@type": "Brand", name: site.name },
    ...(confirmed.length > 0
      ? {
          additionalProperty: confirmed.map((detail) => ({
            "@type": "PropertyValue",
            name: detail.label,
            value: detail.value,
          })),
        }
      : {}),
    offers: {
      "@type": "Offer",
      url: canonicalUrl(`/coffee/${product.slug}`),
      priceCurrency: "INR",
      price: selling.price,
      availability: selling.availability,
    },
  };
}

function productHtml(product: (typeof products)[number]): string {
  const selling = offer(product.slug as CoffeeSlug);
  const confirmed = product.details.filter((detail) => detail.value);
  const notes = product.tastingNotes.length > 0 ? `<p>${esc(product.tastingNotes.join(", "))}.</p>` : "";
  return `<article class="seo-static">
  <h1>${esc(product.name)}</h1>
  <p>${esc(product.blend)}. ${esc(product.tagline)}</p>
  <p>${esc(product.description)}</p>
  <p>${esc(formatPrice(selling.pricePaise))}. ${esc(selling.label)}.</p>
  ${notes}
  ${product.story.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n  ")}
  <dl>
    ${confirmed.map((detail) => `<dt>${esc(detail.label)}</dt><dd>${esc(detail.value as string)}</dd>`).join("\n    ")}
  </dl>
  <ul>
    ${product.brewing.map((step) => `<li>${esc(step.method)}: ${esc(step.note)}</li>`).join("\n    ")}
  </ul>
</article>`;
}

function page(entry: PublicPage): PublicPage {
  return entry;
}

const coffeePages: PublicPage[] = products.map((product) =>
  page({
    path: `/coffee/${product.slug}`,
    title: titled(`${product.name} — ${product.blend}`),
    description: product.description,
    imagePath: product.image.src,
    ogType: "website",
    jsonLd: productJsonLd(product),
    html: productHtml(product),
  }),
);

const journalPages: PublicPage[] = journal.map((article) =>
  page({
    path: `/journal/${article.slug}`,
    title: titled(article.title),
    description: article.excerpt,
    imagePath: article.cover.src,
    ogType: "article",
    ...(article.date ? { lastmod: article.date } : {}),
    html: `<article class="seo-static">
  <h1>${esc(article.title)}</h1>
  <p>${esc(article.excerpt)}</p>
  ${article.body
    .map((block) => {
      if (block.type === "h2") return `<h2>${esc(block.text)}</h2>`;
      if (block.type === "quote") return `<blockquote>${esc(block.text)}</blockquote>`;
      if (block.type === "list") return `<ul>${block.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
      return `<p>${esc(block.text)}</p>`;
    })
    .join("\n  ")}
</article>`,
  }),
);

const legalPages: PublicPage[] = legalNav.map((item) => {
  const slug = item.to.replace("/legal/", "");
  const body = legalCopy[slug];
  if (!body) throw new Error(`Missing legal copy for ${item.to}`);
  return page({
    path: item.to,
    title: titled(item.label),
    description: body.intro,
    imagePath: "/images/hero/hero.jpg",
    ogType: "website",
    html: `<article class="seo-static">
  <h1>${esc(item.label)}</h1>
  <p>${esc(body.intro)}</p>
  ${body.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n  ")}
  <p>Questions? <a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a></p>
</article>`,
  });
});

export const publicPages: PublicPage[] = [
  page({
    path: "/",
    title: titled(),
    description: homeDescription,
    imagePath: "/images/hero/hero.jpg",
    ogType: "website",
    jsonLd: organization,
    html: `<article class="seo-static">
  <h1>${esc(site.name)}</h1>
  <p>${esc(site.tagline)}</p>
  <p>${esc(homeDescription)}</p>
  <ul>
    ${products
      .map((product) => {
        const selling = offer(product.slug as CoffeeSlug);
        return `<li><a href="/coffee/${esc(product.slug)}">${esc(product.name)}</a> — ${esc(product.blend)}. ${esc(formatPrice(selling.pricePaise))}. ${esc(selling.label)}.</li>`;
      })
      .join("\n    ")}
  </ul>
</article>`,
  }),
  page({
    path: "/coffee",
    title: titled("Shop the coffee"),
    description: "Choose by personality, not by jargon. Order direct — secure checkout with Razorpay.",
    imagePath: "/images/hero/hero.jpg",
    ogType: "website",
    html: `<article class="seo-static">
  <h1>Three coffees. Nothing hidden.</h1>
  <p>Choose by personality, not by jargon. Order direct — secure checkout with Razorpay.</p>
  <ul>
    ${products
      .map((product) => {
        const selling = offer(product.slug as CoffeeSlug);
        return `<li><a href="/coffee/${esc(product.slug)}">${esc(product.name)}</a> — ${esc(product.description)} ${esc(formatPrice(selling.pricePaise))}. ${esc(selling.label)}.</li>`;
      })
      .join("\n    ")}
  </ul>
</article>`,
  }),
  ...coffeePages,
  page({
    path: "/shop",
    title: titled("Shop"),
    description: "Order direct. Secure checkout with Razorpay — UPI, cards and netbanking.",
    imagePath: "/images/hero/hero.jpg",
    ogType: "website",
    html: `<article class="seo-static">
  <h1>Everything we make.</h1>
  <p>Order direct. Secure checkout with Razorpay — UPI, cards and netbanking.</p>
  <ul>
    ${products
      .map((product) => {
        const selling = offer(product.slug as CoffeeSlug);
        return `<li><a href="/coffee/${esc(product.slug)}">${esc(product.name)}</a> — ${esc(formatPrice(selling.pricePaise))}. ${esc(selling.label)}.</li>`;
      })
      .join("\n    ")}
  </ul>
</article>`,
  }),
  page({
    path: "/story",
    title: titled("Our story"),
    description: storyIntro,
    imagePath: "/images/story/manifesto.jpg",
    ogType: "website",
    html: `<article class="seo-static">
  <h1>The truth about coffee.</h1>
  <p>${esc(storyIntro)}</p>
  ${principles.map((item) => `<h2>${esc(item.title)}</h2><p>${esc(item.text)}</p>`).join("\n  ")}
</article>`,
  }),
  page({
    path: "/journal",
    title: titled("Journal"),
    description: "Short reads on beans, blends and brewing. No jargon, no lectures.",
    imagePath: journal[0]?.cover.src ?? "/images/hero/hero.jpg",
    ogType: "website",
    html: `<article class="seo-static">
  <h1>Notes on coffee.</h1>
  <p>Short reads on beans, blends and brewing. No jargon, no lectures.</p>
  <ul>
    ${journal.map((article) => `<li><a href="/journal/${esc(article.slug)}">${esc(article.title)}</a> — ${esc(article.excerpt)}</li>`).join("\n    ")}
  </ul>
</article>`,
  }),
  ...journalPages,
  ...legalPages,
];

const byPath = new Map(publicPages.map((entry) => [entry.path, entry]));

export function pageForPath(pathname: string): PublicPage | undefined {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return byPath.get(path);
}

export function renderHead(entry: PublicPage): string {
  const url = canonicalUrl(entry.path);
  const image = abs(entry.imagePath);
  const json = entry.jsonLd ? JSON.stringify(entry.jsonLd).replace(/</g, "\\u003c") : "";
  return `<meta name="seo-slot" content="start" />
    <title>${esc(entry.title)}</title>
    <meta name="description" content="${esc(entry.description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:site_name" content="${esc(site.name)}" />
    <meta property="og:title" content="${esc(entry.title)}" />
    <meta property="og:description" content="${esc(entry.description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:type" content="${entry.ogType}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(entry.title)}" />
    <meta name="twitter:description" content="${esc(entry.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    ${json ? `<script type="application/ld+json" id="seo-jsonld">${json}</script>` : ""}
    <meta name="seo-slot" content="end" />`;
}

export function renderSitemap(entries: PublicPage[]): string {
  const urls = entries
    .map((entry) => {
      const loc = `    <loc>${esc(canonicalUrl(entry.path))}</loc>`;
      const lastmod = entry.lastmod ? `\n    <lastmod>${esc(entry.lastmod)}</lastmod>` : "";
      return `  <url>\n${loc}${lastmod}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function renderRobots(): string {
  return `User-agent: *
Allow: /

Disallow: /admin
Disallow: /checkout
Disallow: /order/
Disallow: /account
Disallow: /track-order

Sitemap: ${ORIGIN}/sitemap.xml
`;
}

const privatePrefixes = ["/admin", "/checkout", "/order", "/account", "/track-order"];

export function isPrivatePath(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  return privatePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}
