/**
 * SITE VERSION
 * ------------------------------------------------------------------
 * Set SITE_VERSION in .env (then restart `npm run dev` / rebuild):
 *
 *   v0 — Waitlist. The public site is the email list. Admin still works.
 *   v1 — Direct store. Buy now, Razorpay, order tracking. No customer login.
 *        Admin stays on. Hosted on Netlify with Supabase.
 *   v2 — Same store, and the customer-account API is mounted too.
 *        The public site still hides account pages for now.
 */

export const siteVersion = __SITE_VERSION__;

export const waitlistEnabled = siteVersion === "v0";
export const storeEnabled = siteVersion !== "v0";
/** Customer accounts stay off until we want sign-in. Admin login is separate. */
export const accountsEnabled = false;
