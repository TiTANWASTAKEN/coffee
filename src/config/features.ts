/**
 * SITE VERSION
 * ------------------------------------------------------------------
 * Set SITE_VERSION in .env (then restart `npm run dev` / rebuild):
 *
 *   v1 — Amazon-only brand site. Every buy button goes to Amazon, no
 *        prices, no cart or accounts, no API calls (can be hosted statically).
 *   v2 — Direct store: shop, cart, Razorpay checkout, customer accounts,
 *        live prices and stock. Needs the API server.
 */

export const siteVersion = __SITE_VERSION__;

export const storeEnabled = siteVersion === "v2";
