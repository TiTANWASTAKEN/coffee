import { useLayoutEffect } from "react";
import { useLocation } from "react-router";
import { ORIGIN, canonicalUrl, pageForPath, type PublicPage } from "@/seo/pages";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonical(href: string | null) {
  document.head.querySelectorAll('link[rel="canonical"]').forEach((element) => element.remove());
  if (!href) return;
  const link = document.createElement("link");
  link.rel = "canonical";
  link.href = href;
  document.head.appendChild(link);
}

function setJsonLd(data: PublicPage["jsonLd"]) {
  document.head.querySelectorAll("script#seo-jsonld").forEach((element) => element.remove());
  if (!data) return;
  const script = document.createElement("script");
  script.id = "seo-jsonld";
  script.type = "application/ld+json";
  script.text = JSON.stringify(data);
  document.head.appendChild(script);
}

function setRobots(content: string | null) {
  const existing = document.head.querySelector('meta[name="robots"]');
  if (!content) {
    existing?.remove();
    return;
  }
  if (!existing) {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = content;
    document.head.appendChild(meta);
    return;
  }
  existing.setAttribute("content", content);
}

function apply(page: PublicPage) {
  const url = canonicalUrl(page.path);
  const image = page.imagePath.startsWith("http") ? page.imagePath : `${ORIGIN}${page.imagePath.startsWith("/") ? page.imagePath : `/${page.imagePath}`}`;
  document.title = page.title;
  setMeta("name", "description", page.description);
  setCanonical(url);
  setMeta("property", "og:title", page.title);
  setMeta("property", "og:description", page.description);
  setMeta("property", "og:url", url);
  setMeta("property", "og:type", page.ogType);
  setMeta("property", "og:image", image);
  setMeta("name", "twitter:title", page.title);
  setMeta("name", "twitter:description", page.description);
  setMeta("name", "twitter:image", image);
  setRobots(null);
  setJsonLd(page.jsonLd);
}

/** Keeps the document head in step with the public route. Private routes stay out of the index. */
export function Seo() {
  const { pathname } = useLocation();
  const page = pageForPath(pathname);

  useLayoutEffect(() => {
    if (page) {
      apply(page);
      return;
    }
    setCanonical(null);
    setJsonLd(undefined);
    setRobots("noindex, nofollow");
  }, [page, pathname]);

  return null;
}
