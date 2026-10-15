import type { CSSProperties } from "react";
import { assets, type ImageAsset, type Tone } from "@/config/assets";

export interface CoffeeTheme {
  tone: Tone;
  accent: string;
  accentDeep: string;
  pack: { bg: string; fg: string; band: string };
}

export interface CoffeeProduct {
  id: string;
  slug: string;
  number: string;
  name: string;
  blend: string;
  blendShort: string;
  tagline: string;
  description: string;
  shortDescription: string;
  character: string;
  personality: string[];
  intensity: number;
  profile: { body: number; aroma: number; balance: number };
  bestFor: string;
  /** Empty until tasting notes are confirmed. The UI says "To be confirmed". */
  tastingNotes: string[];
  /** "#" until the Amazon listing exists. */
  amazonUrl: string;
  image: ImageAsset;
  heroImage: ImageAsset;
  gallery: ImageAsset[];
  story: { heading: string; paragraphs: string[] };
  /** `null` values render as "To be announced". */
  details: { label: string; value: string | null }[];
  brewing: { method: string; note: string }[];
  theme: CoffeeTheme;
}

const honest = assets.products["honest-truth"];
const dark = assets.products["dark-truth"];
const bitter = assets.products["bitter-truth"];

export const products: CoffeeProduct[] = [
  {
    id: "honest-truth",
    slug: "honest-truth",
    number: "01",
    name: "Honest Truth",
    blend: "100% Arabica",
    blendShort: "Arabica",
    tagline: "All the aroma. None of the theatre.",
    description: "A lighter, fragrant cup. Arabica on its own — smooth enough to sip slowly, clear enough that you can taste the bean.",
    shortDescription: "Gentle, fragrant, and easy to sit with.",
    character: "Smooth and aromatic",
    personality: ["Smooth", "Aromatic", "Refined"],
    intensity: 2,
    profile: { body: 2, aroma: 5, balance: 4 },
    bestFor: "Quiet mornings and pour-over",
    tastingNotes: [],
    amazonUrl: "#",
    image: honest.packshot,
    heroImage: honest.campaign,
    gallery: honest.gallery,
    story: {
      heading: "The quiet one.",
      paragraphs: [
        "Honest Truth is 100% Arabica. That’s the whole claim — no origin story we haven’t confirmed, no tasting notes written to sound expensive.",
        "It is the lighter of the three: more aroma than weight, and a cup that stays out of the way of whatever you’re doing.",
      ],
    },
    details: [
      { label: "Beans", value: "100% Arabica" },
      { label: "Origin", value: null },
      { label: "Roast", value: null },
      { label: "Process", value: null },
      { label: "Certification", value: null },
    ],
    brewing: [
      { method: "Pour-over", note: "The best way to hear the aroma. Medium-fine grind, about 1:16." },
      { method: "Filter", note: "An easy everyday cup. Medium grind, and don’t rush the draw-down." },
      { method: "French press", note: "A little more body if you want it. Coarse grind, four minutes, then pour straight away." },
    ],
    theme: {
      tone: "honest",
      accent: "#d9c7a3",
      accentDeep: "#6b4a32",
      pack: { bg: "#efe6d6", fg: "#2c2118", band: "#cbb892" },
    },
  },
  {
    id: "dark-truth",
    slug: "dark-truth",
    number: "02",
    name: "Dark Truth",
    blend: "100% Robusta",
    blendShort: "Robusta",
    tagline: "Heavy, honest, and unapologetic.",
    description: "100% Robusta. A heavier, stronger cup — body, bitterness and caffeine, stated plainly.",
    shortDescription: "Heavy, strong, and no half measures.",
    character: "Bold and intense",
    personality: ["Bold", "Intense", "Powerful"],
    intensity: 5,
    profile: { body: 5, aroma: 3, balance: 2 },
    bestFor: "Strong cups and milk drinks",
    tastingNotes: [],
    amazonUrl: "#",
    image: dark.packshot,
    heroImage: dark.campaign,
    gallery: dark.gallery,
    story: {
      heading: "The loud one.",
      paragraphs: [
        "Dark Truth is 100% Robusta. Robusta is often blended away or apologised for. We’d rather serve it on its own and let you decide.",
        "Expect weight, a bitter edge, and a cup that stands up in milk. If you want something delicate, this is not it — and it doesn’t pretend to be.",
      ],
    },
    details: [
      { label: "Beans", value: "100% Robusta" },
      { label: "Origin", value: null },
      { label: "Roast", value: null },
      { label: "Process", value: null },
      { label: "Certification", value: null },
    ],
    brewing: [
      { method: "French press", note: "Where the body stays. Coarse grind, a slightly heavier dose, four minutes." },
      { method: "Filter", note: "Still strong, a little cleaner. Medium grind and a 1:14 ratio." },
      { method: "Pour-over", note: "Use it if you want the bitterness clearer, not softer. Medium-fine, short of sour." },
    ],
    theme: {
      tone: "dark",
      accent: "#a89890",
      accentDeep: "#3d2b20",
      pack: { bg: "#161311", fg: "#f4f0e8", band: "#3a322c" },
    },
  },
  {
    id: "bitter-truth",
    slug: "bitter-truth",
    number: "03",
    name: "Bitter Truth",
    blend: "70% Arabica / 30% Robusta",
    blendShort: "Blend",
    tagline: "The two beans, kept in check.",
    description: "70% Arabica, 30% Robusta. Aroma from one, body from the other — a cup that holds both without dressing either up.",
    shortDescription: "A little of both, held in check.",
    character: "Balanced and complex",
    personality: ["Balanced", "Bold", "Complex"],
    intensity: 4,
    profile: { body: 4, aroma: 4, balance: 5 },
    bestFor: "Everyday drinking",
    tastingNotes: [],
    amazonUrl: "#",
    image: bitter.packshot,
    heroImage: bitter.campaign,
    gallery: bitter.gallery,
    story: {
      heading: "The one in the middle.",
      paragraphs: [
        "Bitter Truth is a blend on purpose: 70% Arabica for aroma, 30% Robusta for body. The ratio is on the bag because a blend should say what it is.",
        "It is the everyday cup — neither the lightest nor the heaviest of the three, and unwilling to pretend it is either.",
      ],
    },
    details: [
      { label: "Beans", value: "70% Arabica / 30% Robusta" },
      { label: "Origin", value: null },
      { label: "Roast", value: null },
      { label: "Process", value: null },
      { label: "Certification", value: null },
    ],
    brewing: [
      { method: "Filter", note: "The method it was built for. Medium grind, about 1:15, and drink it as it is." },
      { method: "Pour-over", note: "A cleaner read of the same blend. Medium-fine, 1:16." },
      { method: "French press", note: "More of the Robusta’s body. Coarse grind, four minutes." },
    ],
    theme: {
      tone: "bitter",
      accent: "#c98d60",
      accentDeep: "#6b3f25",
      pack: { bg: "#2a1810", fg: "#f6efe6", band: "#c98d60" },
    },
  },
];

export function getProduct(slug: string | undefined): CoffeeProduct | undefined {
  return products.find((product) => product.slug === slug);
}

/** Sets the product accent tokens used by labels, meters and glows. */
export function productThemeStyle(product: CoffeeProduct): CSSProperties {
  return {
    "--accent": product.theme.accent,
    "--accent-deep": product.theme.accentDeep,
  } as CSSProperties;
}
