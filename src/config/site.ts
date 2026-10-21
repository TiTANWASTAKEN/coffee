/**
 * SITE CONFIGURATION
 * ------------------------------------------------------------------
 * Brand-wide settings. Product-specific Amazon links live in
 * `src/data/products.ts` — this file only holds the main store link.
 */

import { storeEnabled, waitlistEnabled } from "./features";

export const site = {
  /** Company name — page titles, legal copy, payment screens. */
  name: "Bitter Truth Coffee",
  /** Wordmark — where space is tight (logo, footer type). */
  shortName: "Bitter Truth",
  monogram: "BT",
  tagline: "Coffee without the pretence.",
  description: "Three coffees. Three personalities. Nothing hidden.",

  /**
   * Main Amazon CTA ("Shop on Amazon").
   * Paste your Amazon brand store / storefront URL here.
   * While it is "#", the button is shown as "Amazon listing coming soon".
   */
  brandAmazonUrl: "#",

  /**
   * Optional Amazon tracking / affiliate parameters appended to every
   * Amazon link (e.g. { tag: "yourtag-21" }). Leave empty for none.
   */
  amazonTracking: {} as Record<string, string>,

  contactEmail: "thebittertruthcoffee@gmail.com",

  /** "#" = not live yet. Links render as "soon" until replaced. */
  social: [
    { label: "Instagram", href: "https://www.instagram.com/bittertruthcoffee.in/" },
    { label: "YouTube", href: "#" },
    { label: "Facebook", href: "#" },
  ],
} as const;

export interface NavItem {
  label: string;
  to: string;
}

export const primaryNav: NavItem[] = waitlistEnabled
  ? []
  : [
      ...(storeEnabled
        ? [
            { label: "Shop", to: "/shop" },
            { label: "Our Coffee", to: "/coffee" },
            { label: "Track", to: "/track-order" },
          ]
        : [{ label: "Shop", to: "/coffee" }]),
      { label: "Story", to: "/story" },
      { label: "Journal", to: "/journal" },
    ];

export const legalNav: NavItem[] = [
  { label: "Privacy", to: "/legal/privacy" },
  { label: "Terms", to: "/legal/terms" },
  { label: "Shipping", to: "/legal/shipping" },
  { label: "Returns", to: "/legal/returns" },
];
