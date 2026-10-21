/**
 * IMAGE REGISTRY
 * ------------------------------------------------------------------
 * Every image on the site is referenced from here — components never
 * hard-code image paths.
 *
 * To use real photography:
 *   1. Drop the file into /public/images/... at the path shown in `src`
 *      (or change `src` to your filename).
 *   2. Set `ready: true`.
 *
 * While `ready` is false, a designed placeholder is rendered instead
 * (no broken images, no 404s). If a `ready` image fails to load, the
 * placeholder is shown as a fallback.
 */

export type PlaceholderVariant = "cup" | "packshot" | "beans" | "pour" | "texture";
export type Tone = "neutral" | "honest" | "dark" | "bitter";

export interface ImageAsset {
  /** Public path, e.g. "/images/hero/hero.jpg". */
  src: string;
  /** Flip to true once the file exists in /public. */
  ready: boolean;
  alt: string;
  /** Optional responsive sources, e.g. "/images/hero/hero-1200.jpg 1200w, /images/hero/hero-2400.jpg 2400w". */
  srcSet?: string;
  /** Optional separately-cropped image for phones (below 768px), e.g. a portrait hero. */
  mobileSrc?: string;
  /** `contain` keeps a studio product shot whole. Photos crop with `cover`. */
  fit?: "cover" | "contain";
  /** Stand-in settings — only used while `ready` is false. */
  placeholder: {
    label: string;
    variant: PlaceholderVariant;
    tone: Tone;
  };
}

function image(
  src: string,
  alt: string,
  placeholder: ImageAsset["placeholder"],
  ready = true,
  fit?: ImageAsset["fit"],
): ImageAsset {
  return { src, ready, alt, placeholder, ...(fit ? { fit } : {}) };
}

function productImages(slug: "honest-truth" | "dark-truth" | "bitter-truth", name: string, tone: Tone) {
  const base = `/images/products/${slug}`;
  return {
    packshot: image(`${base}/packshot.jpg`, `${name} coffee`, { label: name, variant: "packshot", tone }),
    campaign: image(`${base}/campaign.jpg`, `${name} campaign photograph`, { label: `${name} — Campaign`, variant: "cup", tone }),
    gallery: [
      image(`${base}/gallery-1.jpg`, `${name} detail`, { label: `${name} — Detail`, variant: "beans", tone }),
      image(`${base}/gallery-2.jpg`, `${name} being brewed`, { label: `${name} — Brew`, variant: "pour", tone }),
      image(`${base}/gallery-3.jpg`, `${name} in the cup`, { label: `${name} — Cup`, variant: "cup", tone }),
    ],
  };
}

export const assets = {
  hero: {
    main: {
      ...image("/images/hero/hero.jpg", "A black cup of coffee on a dark table", {
        label: "Hero — Cinematic coffee",
        variant: "cup",
        tone: "neutral",
      }),
      // Uncomment once public/images/hero/hero-mobile.jpg (1080×1920 portrait) exists:
      // mobileSrc: "/images/hero/hero-mobile.jpg",
    },
  },

  products: {
    "honest-truth": productImages("honest-truth", "Honest Truth", "honest"),
    "dark-truth": {
      ...productImages("dark-truth", "Dark Truth", "dark"),
      packshot: image("/images/products/dark-truth/packshot.jpg?v=3", "Dark Truth whole-bean coffee bag, 250g", { label: "Dark Truth", variant: "packshot", tone: "dark" }, true, "contain"),
    },
    "bitter-truth": productImages("bitter-truth", "Bitter Truth", "bitter"),
  },

  story: {
    arabica: image("/images/story/arabica.jpg", "Arabica coffee beans", { label: "Arabica", variant: "beans", tone: "honest" }),
    robusta: image("/images/story/robusta.jpg", "Robusta coffee beans", { label: "Robusta", variant: "beans", tone: "dark" }),
    blend: image("/images/story/blend.jpg", "Arabica and Robusta beans together", { label: "The Blend", variant: "beans", tone: "bitter" }),
    manifesto: image("/images/story/manifesto.jpg", "Coffee being poured in a dark room", { label: "The Truth About Coffee", variant: "pour", tone: "neutral" }),
  },

  journal: {
    "how-to-choose-your-coffee": image("/images/journal/how-to-choose-your-coffee.jpg", "Three coffees side by side", { label: "Journal — Choosing", variant: "texture", tone: "honest" }),
    "arabica-vs-robusta": image("/images/journal/arabica-vs-robusta.jpg", "Arabica and Robusta beans", { label: "Journal — Arabica vs Robusta", variant: "beans", tone: "neutral" }),
    "why-blends-exist": image("/images/journal/why-blends-exist.jpg", "A blend of coffee beans", { label: "Journal — Blends", variant: "texture", tone: "bitter" }),
    "how-to-brew-better-coffee": image("/images/journal/how-to-brew-better-coffee.jpg", "Coffee being brewed by hand", { label: "Journal — Brewing", variant: "pour", tone: "dark" }),
  },
} as const;
