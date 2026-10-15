/**
 * SITE VERSION
 * ------------------------------------------------------------------
 * Set SITE_VERSION in .env (then restart `npm run dev` / rebuild):
 *
 *   v0 — Waitlist. The public site is the email list. Admin still works.
 *   v1 — Amazon-only brand site. Every buy button goes to Amazon, no
 *        prices, no cart or accounts (can be hosted statically).
 *   v2 — Direct store: shop, cart, Razorpay checkout, customer accounts,
 *        live prices and stock. Needs the API server.
 */

export const siteVersion = __SITE_VERSION__;

export const waitlistEnabled = siteVersion === "v0";
export const storeEnabled = siteVersion === "v2";
