import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createServer } from "vite";

type PublicPage = {
  path: string;
  title: string;
  description: string;
  imagePath: string;
  ogType: "website" | "article";
  lastmod?: string;
  jsonLd?: Record<string, unknown>;
  html: string;
  head: string;
};

const root = process.cwd();
const snapshotPath = path.join(root, "node_modules", ".cache", "seo-snapshot.json");
const privateSnippets = ["/admin", "/checkout", "/cart", "/order", "/account", "/track-order"];

async function loadPages(): Promise<PublicPage[]> {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  try {
    const mod = (await vite.ssrLoadModule("/src/seo/pages.ts")) as {
      publicPages: Omit<PublicPage, "head">[];
      renderHead: (page: Omit<PublicPage, "head">) => string;
      renderSitemap: (pages: Omit<PublicPage, "head">[]) => string;
      renderRobots: () => string;
      isPrivatePath: (pathname: string) => boolean;
      ORIGIN: string;
    };
    if (mod.ORIGIN !== "https://bittertruthcoffee.in") {
      throw new Error(`Unexpected site origin: ${mod.ORIGIN}`);
    }
    const pages = mod.publicPages.map((page) => ({ ...page, head: mod.renderHead(page) }));
    for (const page of pages) {
      if (mod.isPrivatePath(page.path)) throw new Error(`${page.path} is private and cannot be public.`);
      if (page.head.includes("noindex")) throw new Error(`${page.path} head contains noindex.`);
    }
    const titles = new Set(pages.map((page) => page.title));
    if (titles.size !== pages.length) throw new Error("SEO titles are not unique.");
    const descriptions = new Set(pages.map((page) => page.description));
    if (descriptions.size !== pages.length) throw new Error("SEO descriptions are not unique.");
    writeFileSync(path.join(root, "public", "sitemap.xml"), mod.renderSitemap(pages));
    writeFileSync(path.join(root, "public", "robots.txt"), mod.renderRobots());
    writeFileSync(path.join(root, "public", "_redirects"), renderRedirects(pages));
    return pages;
  } finally {
    await vite.close();
  }
}

function renderRedirects(pages: PublicPage[]): string {
  const lines = [
    "/api/*  /.netlify/functions/api/:splat  200",
    "/sitemap.xml  /sitemap.xml  200",
    "/robots.txt  /robots.txt  200",
  ];
  for (const page of pages) {
    if (!page.path.startsWith("/coffee/")) continue;
    const slug = page.path.slice("/coffee/".length);
    lines.push(`/shop/${slug}  /coffee/${slug}  301`);
  }
  for (const page of pages) {
    if (page.path === "/") continue;
    lines.push(`${page.path}/  ${page.path}  301`);
  }
  for (const page of pages) {
    if (page.path === "/") continue;
    lines.push(`${page.path}  ${page.path}/index.html  200`);
  }
  lines.push("/*      /index.html                    200");
  return `${lines.join("\n")}\n`;
}

function writeSnapshot(pages: PublicPage[]) {
  mkdirSync(path.dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, JSON.stringify(pages));
}

function readSnapshot(): PublicPage[] {
  return JSON.parse(readFileSync(snapshotPath, "utf8")) as PublicPage[];
}

function prerender(pages: PublicPage[]) {
  const distIndex = path.join(root, "dist", "index.html");
  const template = readFileSync(distIndex, "utf8");
  const slot = /<meta name="seo-slot" content="start"\s*\/?>[\s\S]*?<meta name="seo-slot" content="end"\s*\/?>/;
  if (!slot.test(template)) throw new Error("Built index.html is missing the seo-slot markers.");
  if (!template.includes('<div id="root"></div>')) throw new Error("Built index.html is missing the root placeholder.");

  for (const page of pages) {
    const withHead = template.replace(slot, page.head);
    // `/` is also the SPA fallback, so its root stays empty. Other public URLs get their own HTML.
    const next = page.path === "/" ? withHead : withHead.replace('<div id="root"></div>', `<div id="root">${page.html}</div>`);
    const target = page.path === "/" ? distIndex : path.join(root, "dist", page.path.slice(1), "index.html");
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, next);
  }
  validate(pages);
}

function validate(pages: PublicPage[]) {
  const sitemap = readFileSync(path.join(root, "dist", "sitemap.xml"), "utf8");
  const robots = readFileSync(path.join(root, "dist", "robots.txt"), "utf8");
  if (!sitemap.startsWith("<?xml")) throw new Error("sitemap.xml is not XML.");
  if (!sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
    throw new Error("sitemap.xml is missing the sitemap namespace.");
  }
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
  const expected = pages.map((page) => (page.path === "/" ? "https://bittertruthcoffee.in/" : `https://bittertruthcoffee.in${page.path}`));
  if (locs.join("\n") !== expected.join("\n")) {
    throw new Error(`Sitemap URLs do not match the public pages.\n${locs.join("\n")}`);
  }
  for (const snippet of privateSnippets) {
    if (locs.some((loc) => loc.includes(snippet))) throw new Error(`Sitemap includes a private path: ${snippet}`);
  }
  if (!robots.includes("Allow: /")) throw new Error("robots.txt does not allow public crawling.");
  if (!robots.includes("Sitemap: https://bittertruthcoffee.in/sitemap.xml")) {
    throw new Error("robots.txt is missing the sitemap URL.");
  }
  for (const blocked of ["/coffee", "/images", "/assets", "/shop\n", "/journal", "/story"]) {
    if (robots.includes(`Disallow: ${blocked}`)) throw new Error(`robots.txt blocks ${blocked}`);
  }

  const seenCanonical = new Set<string>();
  for (const page of pages) {
    const file = page.path === "/" ? path.join(root, "dist", "index.html") : path.join(root, "dist", page.path.slice(1), "index.html");
    const html = readFileSync(file, "utf8");
    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((match) => match[1] ?? "");
    if (canonicals.length !== 1) throw new Error(`${page.path} has ${canonicals.length} canonical tags.`);
    const canonical = canonicals[0] ?? "";
    if (seenCanonical.has(canonical)) throw new Error(`Duplicate canonical ${canonical}`);
    seenCanonical.add(canonical);
    const expectedCanonical = page.path === "/" ? "https://bittertruthcoffee.in/" : `https://bittertruthcoffee.in${page.path}`;
    if (canonical !== expectedCanonical) throw new Error(`${page.path} canonical is ${canonical}`);
    if (!html.includes(`property="og:url" content="${expectedCanonical}"`)) throw new Error(`${page.path} og:url does not match its canonical.`);
    if (!html.includes(`<title>${page.title}</title>`)) throw new Error(`${page.path} title was not written.`);
    if (!html.includes(`name="description" content="${escapeAttr(page.description)}"`)) {
      throw new Error(`${page.path} description was not written.`);
    }
    if (/noindex/i.test(html)) throw new Error(`${page.path} contains noindex.`);
    if (page.path === "/" && html.includes("seo-static")) throw new Error("Homepage shell includes static body HTML.");
    if (page.path !== "/" && !html.includes("seo-static")) throw new Error(`${page.path} is missing static body HTML.`);
    if (page.path !== "/" && !html.includes("<h1>")) throw new Error(`${page.path} has no heading in the HTML.`);
    if (page.path.startsWith("/coffee/")) {
      if (!html.includes('"@type":"Product"')) throw new Error(`${page.path} is missing Product JSON-LD.`);
      const price = page.jsonLd?.offers && typeof page.jsonLd.offers === "object" ? (page.jsonLd.offers as { price?: string }).price : undefined;
      if (!price || !html.includes(`"price":"${price}"`)) throw new Error(`${page.path} JSON-LD price is missing.`);
      if (!html.includes("₹")) throw new Error(`${page.path} HTML is missing the rupee price.`);
    }
    if (page.path === "/" && !html.includes('"@type":"Organization"')) {
      throw new Error("Homepage is missing Organization JSON-LD.");
    }
  }
  console.log(`SEO checks passed (${pages.length} public URLs).`);
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

const command = process.argv[2];
if (command === "public") {
  const pages = await loadPages();
  writeSnapshot(pages);
  console.log(`Wrote sitemap.xml, robots.txt, and ${pages.length} page records.`);
} else if (command === "prerender") {
  prerender(readSnapshot());
} else {
  throw new Error('Usage: tsx scripts/seo.mts public|prerender');
}
