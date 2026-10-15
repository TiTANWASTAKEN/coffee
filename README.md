# Bitter Truth Coffee — Coffee without the pretence

Brand and product-discovery website for **Bitter Truth Coffee**: three coffees, three personalities, nothing hidden.

The company name lives in `src/config/site.ts` (`name: "Bitter Truth Coffee"`, `shortName: "Bitter Truth"` for the logo, `monogram: "BT"`). The coffees keep their own names:

| Coffee       | Beans                     |
| ------------ | ------------------------- |
| Honest Truth | 100% Arabica              |
| Dark Truth   | 100% Robusta              |
| Bitter Truth | 70% Arabica / 30% Robusta |

**v0 — waitlist:** the public site is an email list. Every signup is saved and shown in `/admin` under Waitlist.

**v1 — Amazon:** a brand site — every buy button goes to Amazon. No server needed; it can be hosted statically.

**v2 — store:** customers add coffees to a cart and pay on the site through **Razorpay** (UPI, cards, netbanking, wallets), with optional customer accounts (saved addresses, order history and tracking). The admin shows orders and sales, and lets you manage products, prices, stock and images.

### Choosing the version

One setting in `.env` picks the version — restart `npm run dev` (or rebuild) after changing it:

```bash
SITE_VERSION=v0   # public waitlist; emails appear in /admin
SITE_VERSION=v1   # Amazon-only brand site
SITE_VERSION=v2   # direct store: shop, cart, Razorpay checkout, customer accounts
```

In **v0** the public site is the waitlist. The shop, cart and account pages are not shown. Signups are stored in the database and listed after you sign in at `/admin`.

In **v1** the shop, cart, checkout, order and account pages don't exist (they 404), the cart and account icons are hidden, prices aren't shown, the site makes no API calls, and the server switches the store and account APIs off. The admin works in every version.

**Stack:** React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Framer Motion 12 · React Router 7 · Lucide icons · self-hosted fonts (Playfair 2 + Instrument Sans via Fontsource).
**Server:** Express 5 · SQLite (Node's built-in `node:sqlite`) · Multer for uploads · Razorpay Orders API.

---

## Getting started

Requires **Node 22.13+** (for the built-in SQLite module).

```bash
npm install
cp .env.example .env   # then fill it in — see below
npm run dev            # site: http://localhost:5173 · API: http://localhost:4000
```

`npm run dev` starts the API server and the Vite dev server together; Vite proxies `/api` and `/uploads` to the API.

```bash
npm run build      # type-check + production build → dist/
npm start          # API + built site on one port (http://localhost:4000)
npm run typecheck  # TypeScript only
```

### Environment (`.env`)

| Variable | What it is |
| --- | --- |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Login for `/admin`. Use a long, unique password. |
| `JWT_SECRET` | Signs admin and customer sessions. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → Account & Settings → API Keys. Use **Test Mode** keys while developing. |
| `RAZORPAY_WEBHOOK_SECRET` | Optional, recommended in production (see below). |
| `SITE_VERSION` | `v0` (waitlist), `v1` (Amazon-only) or `v2` (direct store). See above. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Free Supabase project. The service-role key stays on the server and must never use a `VITE_` name. Without these, waitlist emails stay in the local database. |
| `TEST_PAYMENTS` | Development only. `true` adds "Simulate payment" buttons at checkout. Ignored with live keys. |
| `PUBLIC_URL` | The site's public address, used in password-reset and order-tracking links. Default `http://localhost:5173`; **must be your real `https://` domain in production.** |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sends password-reset and order emails through [Resend](https://resend.com). Without them, the message is printed in the server terminal. That is not a delivered email. |
| `SHIPPING_PAISE` | Shipping charge in paise (`100` = ₹1). Set `0` for free shipping. If unset, checkout shows shipping as not configured and charges ₹0. |
| `COD_ENABLED` | `true` offers cash on delivery. The order stays unpaid until you mark it collected in the admin. |
| `UPI_VPA`, `UPI_PAYEE_NAME` | Optional manual UPI. A customer reference is stored only; it never marks the order paid. |
| `ADMIN_NOTIFY_EMAIL` | Optional extra copy of each order email. |
| `SUPPORT_EMAIL` | Shown in order emails. Default `hello@yourdomain.com` until you set yours. |
| `DATA_DIR` | Optional. Where `store.db` and uploaded images live. Default `./data`. Back this directory up. |
| `PORT` | Optional. API port, default `4000`. |

Without Razorpay keys the site still runs, but checkout shows "Payments are not set up yet".

---

## Shop, cart and checkout

| Path | Page |
| --- | --- |
| `/shop` | Every active product in the database |
| `/shop/:slug` | Detail page for products added in the admin |
| `/checkout` | Contact + shipping form, order summary, Pay button |
| `/order/:id` | Confirmation page (the id is a random token, not the order number) |
| `/track-order` | Customer tracking. Needs the order code and the email or phone on the order. |

- The **cart** lives in `localStorage` and opens as a drawer from the bag icon in the navbar.
- **Prices and stock always come from the server.** The browser only sends product ids and quantities; the server recalculates the total and checks stock before creating the Razorpay order.
- **Payment flow:** server creates a Razorpay order → Razorpay Checkout opens → on success the browser sends the payment signature to `/api/checkout/verify` → the server checks the HMAC signature with your key secret, marks the order paid and takes the items out of stock (only once, even if called twice).
- Coffee pages (`/coffee/:slug`) show live price and stock, and their **Add to cart** buttons use the product with the same slug in the database (`honest-truth`, `dark-truth`, `bitter-truth`). If a coffee isn't in the database, its button falls back to the Amazon link in `src/data/products.ts`.

### Testing payments

With Test Mode keys, use Razorpay's [test cards and UPI IDs](https://razorpay.com/docs/payments/payments/test-card-details/) — e.g. UPI `success@razorpay`. No real money moves.

To skip Razorpay entirely while building, set `TEST_PAYMENTS=true`: checkout gets **Simulate successful payment** / **Simulate failed payment** buttons that settle the order on the server. Remove it before going live.

### Webhook (recommended for production)

If a customer pays and closes the tab before being redirected, the webhook still marks the order paid.

1. Razorpay Dashboard → Webhooks → Add: URL `https://your-domain/api/webhooks/razorpay`, events `order.paid` and `payment.failed`, and a secret.
2. Put that secret in `RAZORPAY_WEBHOOK_SECRET`.

---

## Customer accounts (`/account`)

| Path | Page |
| --- | --- |
| `/account` | Orders (with shipping progress), saved addresses, profile and password |
| `/account/login`, `/account/register` | Sign in / create an account |
| `/account/forgot`, `/account/reset` | Password reset by email link (valid 1 hour, single use) |

- Accounts are optional — guests can still check out. Orders placed **while signed in** appear under the account; earlier guest orders are not linked.
- At checkout, signed-in customers get their details and default address filled in, can pick another saved address, and can tick "Save this address to my account".
- Every order's `/order/:id` page doubles as a tracking page (Order placed → Shipped → Delivered), driven by the fulfilment status you set in the admin.
- Passwords are hashed with scrypt. Sessions are an httpOnly cookie lasting 30 days; changing or resetting a password signs out every other device. Sign-in, sign-up and reset requests are rate-limited.
- Password-reset emails need `RESEND_API_KEY` and `EMAIL_FROM` (verify your domain in Resend first). Until then, the reset link is printed in the server terminal.

---

## Admin (`/admin`)

Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

- **Dashboard** — verified revenue (pending and unpaid COD are shown separately and are not counted as collected), orders waiting to ship, refunds, low-stock products, recent orders.
- **Orders** — filter by payment status and date, search by name / email / phone / order code, export CSV. Open an order to verify a UPI or COD payment, add courier tracking, resend the email, refund (recorded here; you still return the money in Razorpay), or move fulfilment only along the allowed steps. Unverified non-COD orders cannot be packed or shipped.
- **Products** — list with price, quantity in stock and status. Create, edit, hide or delete products; upload up to 12 images each (JPG/PNG/WebP/AVIF/GIF, 5 MB max), reorder them and pick the cover. Uploaded images replace the placeholder packshot and gallery on the matching coffee page.

On first run the database is seeded with the three coffees at placeholder prices (₹499 / ₹449 / ₹479) and 25 units each — **set the real prices and stock in the admin before launch.**

Sessions are an httpOnly, SameSite=Strict cookie that lasts 7 days. Login is rate-limited to 10 attempts per 15 minutes per IP.

---

## Deploying

**v0, free:** Netlify hosts the site and a function. Supabase’s free database stores the emails. Checkout is not part of this deploy.

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/waitlist.sql`.
3. In Supabase → Project Settings → API, copy the project URL and the `service_role` key.
4. In Netlify → Site configuration → Environment variables, set `SITE_VERSION=v0`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `JWT_SECRET`. Do not commit those values.
5. Publish this repo. The build command is `npm run build` and the publish directory is `dist`.
6. Open `/admin`, sign in, and the Waitlist page lists every email.

**v1:** `npm run build` and host `dist/` on any static host. `netlify.toml`, `vercel.json` and `public/_redirects` send unknown paths to `index.html`. The admin and checkout will not work on a static host, because they need the API.

**v2:** set `SITE_VERSION=v2` on the host (it's read at build time and by the server). The shop needs a long-lived Node 22 process **with a persistent disk** — for example Render, Railway, Fly.io or a VPS. Netlify can still publish the static `dist/` folder, but it will not run checkout or keep the SQLite order database. Supabase’s free tier does not remove Razorpay’s per-payment fee.

1. Build command: `npm install && npm run build`
2. Start command: `npm start`
3. Set the environment variables above, and point `DATA_DIR` at the persistent disk (e.g. `/var/data`) so orders and images survive redeploys.
4. Serve over HTTPS (the admin cookie is marked `Secure` behind HTTPS automatically).

Back up `DATA_DIR` regularly when you run the store server — it contains `store.db` and every uploaded image. To restore, stop the server, replace that directory from the backup, and start again. Waitlist emails stored in Supabase are backed up from the Supabase dashboard.

---

## Project structure

```text
server/
  index.ts           Express app: API, /uploads, and the built site in production
  config.ts          Reads .env
  db.ts              SQLite schema, queries, seed data
  auth.ts            Admin login, session cookie, rate limit
  customers.ts       Customer accounts, password hashing, reset tokens, saved addresses
  customerSession.ts Customer session cookie
  email.ts           Sends email via Resend (or prints it in dev)
  razorpay.ts        Razorpay order creation + signature checks
  routes/store.ts    Public API: products, checkout, verify, order lookup, webhook
  routes/account.ts  Customer API: sign up/in, password reset, profile, addresses, orders
  routes/admin.ts    Admin API: stats, orders, products, image uploads
shared/
  store.ts           Types shared by server and client
scripts/dev.mjs      Runs API + Vite together for `npm run dev`
src/
  admin/             Admin app (lazy-loaded): login, dashboard, orders, products
  store/             CatalogProvider (live prices/stock/images), CartProvider, AccountProvider
  components/cart/   CartDrawer, QuantityStepper
  components/shop/   StoreProductCard, AddToCartButton
  components/account/ AuthShell, AddressForm, OrderTracker
  pages/             … plus Shop, ShopProduct, Checkout, OrderConfirmation
  pages/account/     Account, Login, Register, ForgotPassword, ResetPassword
  config/
    site.ts            Brand name, tagline, brandAmazonUrl, email, social, navigation
    assets.ts          Every image path on the site (the image registry)
  data/
    products.ts        The three coffees — copy, profiles, themes, Amazon URLs
    journal.ts         Journal posts
    brewing.ts         Brewing methods (general guidance)
    story.ts           Brand principles + Arabica/Robusta/Blend chapters
    reviews.ts         Customer reviews (empty until real ones exist)
  styles/
    theme.css          Design tokens: colours, type scale, spacing, radius, shadows, easing
    index.css          Base styles, utilities (eyebrow, label, link-underline, grain…)
  lib/
    links.ts           amazonHref() — placeholder detection + tracking params
    analytics.ts       track() seam for GA4 / Meta Pixel later
    motion.ts          Motion tokens and reveal variants
  hooks/               useMediaQuery, useLockScroll, useDocumentTitle
  components/
    layout/            Layout, Navbar, MobileMenu, SearchOverlay, Footer, Intro (loader),
                       PageTransition, PageHeader, CustomCursor, GrainOverlay
    sections/          Hero, IntroStatement, Marquee, VisualStory, ProductComparison,
                       CoffeeQuiz, StorySection, BrewingSection, Reviews, AmazonCTA
    product/           ProductCard, ProductGrid, ProductFeature, ProductHero, ProductTaste,
                       ProductStory, ProductDetails, ProductGallery, ProductCTA, StickyBuyBar
    journal/           JournalCard, JournalPreview
    media/             SmartImage (photo or placeholder), Placeholder (designed stand-ins)
    motion/            Reveal / Stagger, RevealText, ImageReveal
    ui/                Button, BuyButton, Meter, SectionHeading, Wordmark, ExternalLink
  pages/               Home, Coffee, Product, Story, Journal, JournalArticle, Legal, NotFound
public/
  images/              hero/ · products/<slug>/ · story/ · journal/
```

### Routes

| Path                  | Page                                         |
| --------------------- | -------------------------------------------- |
| `/`                   | Home                                         |
| `/coffee`             | Shop — all three coffees, compare, quiz      |
| `/coffee/:slug`       | `honest-truth`, `dark-truth`, `bitter-truth` |
| `/story`              | Brand story                                  |
| `/journal`            | Journal index                                |
| `/journal/:slug`      | Journal article                              |
| `/legal/:slug`        | `privacy`, `terms`, `shipping`, `returns`    |
| anything else         | 404                                          |

---

## Adding Amazon URLs

**Product links** live in one place only — `src/data/products.ts`:

```ts
{
  id: "honest-truth",
  // …
  amazonUrl: "https://www.amazon.in/dp/XXXXXXXXXX",
}
```

**The main "Shop on Amazon" button** (footer and closing CTA) uses `brandAmazonUrl` in `src/config/site.ts`.

While a URL is `"#"`, its buttons render as a disabled **"Amazon listing coming soon"** state, so nobody gets sent to a dead link. Paste the real URL and every button for that coffee becomes live: it opens in a new tab with `rel="noopener noreferrer"`.

**Affiliate or tracking parameters:** set them in `site.amazonTracking` (for example `{ tag: "yourtag-21" }`) and they're appended to every Amazon link automatically.

---

## Replacing images

All images are registered in `src/config/assets.ts`. Components never hard-code paths.

1. Export the photo at the exact size in **[Asset list](#asset-list)** at the end of this file.
2. Drop it into `public/images/…` using the filename already listed in `assets.ts`, for example `public/images/hero/hero.jpg`.
3. In `assets.ts`, flip that entry's last argument to `true` (the `ready` flag):

```ts
hero: {
  main: image("/images/hero/hero.jpg", "A cup of black coffee…", { … }, true),
},
```

While `ready` is `false`, a designed CSS placeholder is rendered instead: a lit cup, product pouch, beans, pour, or texture, toned per coffee and tagged "Image placeholder". If a `ready` image fails to load, the placeholder is shown as a fallback, so nothing ever looks broken.

**Responsive images:** add an optional `srcSet` to any asset (`"/images/hero/hero-1200.jpg 1200w, /images/hero/hero-2400.jpg 2400w"`). Below-the-fold images are lazy-loaded automatically; hero images load eagerly with high priority.

---

## Updating product information

Everything about a coffee is in `src/data/products.ts`: name, blend, tagline, descriptions, story, personality words, comparison scales (`intensity` and `profile`, 1–5, labelled "indicative" on the site), "best for", brewing suggestions, details and accent theme.

**Content rule:** fields set to `null` (in `details`) or left empty (`tastingNotes: []`) are facts that haven't been confirmed. The UI shows them as "To be announced" or "To be confirmed". Fill them in only with verified information. No origins, roast profiles, certifications or tasting notes have been invented.

**Accent theme:** each product has a `theme` (`accent`, `accentDeep`, and `pack` colours for the bag placeholder). It tints labels, meters, rules and glows on that product's page and cards, while the site palette stays the same.

---

## Adding journal posts

Add an object to the `journal` array in `src/data/journal.ts`:

```ts
{
  slug: "my-new-post",               // → /journal/my-new-post
  title: "My new post",
  excerpt: "One-line summary.",
  category: "Guide",                  // new categories appear as filters automatically
  readingTime: "3 min read",
  date: "2026-11-01",                 // or null
  cover: assets.journal["my-new-post"],
  body: [
    { type: "p", text: "Paragraph…" },
    { type: "h2", text: "Subheading" },
    { type: "quote", text: "Pull quote." },
    { type: "list", items: ["One", "Two"] },
  ],
}
```

Then register the cover in `assets.ts` → `journal`. The post appears on `/journal`, in search, and on the home page (the first four posts).

The starter posts contain general coffee knowledge only. Review them before launch.

---

## Changing brand colours

Edit `src/styles/theme.css`. Each token becomes a Tailwind utility and a CSS variable:

```css
--color-ink: #0d0c0b;      /* background */
--color-surface: #151311;  /* cards / panels */
--color-ivory: #f4f0e8;    /* primary text */
--color-muted: #a7a096;    /* secondary text */
--color-coffee: #5a3928;   /* accent, use sparingly */
--color-line: rgb(244 240 232 / 0.12);
```

The default accent (`--accent`) is set under `:root` in the same file; products override it.

## Typography

Two families, each with one job:

| Role | Font | Used for |
| --- | --- | --- |
| Display | **Playfair 2** (variable, optical size 5–1200) | Headlines, product names, numerals, pull quotes, italic taglines |
| Sans | **Instrument Sans** (variable) | Body copy, navigation, buttons, eyebrows/labels, forms, data |

Playfair's optical-size axis is applied automatically, so hairlines get finer at hero sizes and sturdier at small heading sizes. Use light (300) for display sizes, regular (400) for small headings, and medium (500) only for the tracked wordmark. Instrument Sans uses 400 for reading, 500 for eyebrows and 600 for buttons.

Only the Latin subsets download (via `unicode-range`); the Playfair italic file loads only on pages that use italics.

## Changing typography

Fonts are self-hosted through Fontsource and imported in `src/main.tsx`. To swap them:

1. `npm install @fontsource-variable/<font>`
2. Replace the imports in `src/main.tsx`.
3. Update `--font-display` / `--font-sans` in `src/styles/theme.css`.

The fluid type scale (`text-display-xs` … `text-display-xl`, `text-lead`, `text-body`, `eyebrow`, `label`) is defined in the same file.

---

## Motion and accessibility

- Framer Motion respects `prefers-reduced-motion` globally (`MotionConfig reducedMotion="user"`), and CSS animations are disabled under the same setting. The intro loader is skipped entirely.
- The intro plays once per browser session and lasts about 1.5 seconds.
- The custom cursor and hero pointer parallax only run on fine pointers (mouse or trackpad), never on touch.
- Includes semantic landmarks, a skip link, visible focus states, keyboard-operable menus, search and quiz, `inert` background while overlays are open, focus return on close, and a real `<table>` for the desktop comparison.

## Ready for later

The architecture leaves seams for future work without implementing it now:

- **Shipping fees / discount codes:** totals are calculated in `readItems()` / `insertOrder()` on the server — add them there, never in the browser.
- **Order emails:** hook into `markOrderPaid()` in `server/db.ts`, right after the order flips to paid (that branch runs once per order).
- **Analytics / Meta Pixel / GA4:** wire them into `track()` in `src/lib/analytics.ts`. It's already called on Buy clicks, quiz results and searches.
- **CMS:** pages read from `src/data/*`, so swapping in fetched data is local to those files.
- **Reviews:** add entries to `src/data/reviews.ts` and the section switches from "coming soon" to a review grid.
- **WhatsApp ordering / subscriptions:** add a field to `CoffeeProduct` and a sibling button next to `BuyButton`.

---

## UX standards

Rules the site follows. Keep them when adding pages.

- **3 clicks to anything.** Home → coffee page is 1 click (product cards, or the coffee names along the bottom of the hero). Any page → coffee page is 2 clicks (Shop → coffee). Coffee page → Amazon is 1 more.
- **The buy button is always within reach.** On phones the sticky buy bar shows from the first screen of a coffee page; on desktop it appears once the hero scrolls away and hides when the closing CTA is on screen.
- **One primary action per screen.** Solid button = the thing we want; outline = the alternative.
- **No dead ends.** The 404 page links to the coffee; empty search suggests terms; unconfirmed facts say "To be announced" instead of disappearing.
- **No dead links.** Amazon URLs still set to `#` render as a disabled "Coming soon" button, never a link to nowhere.
- **Stable layout.** No layout shift on load (measured CLS 0 on every page at 375px and 1440px), no sideways jump when menus lock scrolling, headlines wait for the font before animating in.
- **Touch targets ≥ 44px**, visible focus rings, keyboard-operable menus/search/quiz, skip link, reduced-motion respected.
- **Fast first paint.** Hero image loads eagerly with high priority, everything below the fold lazy-loads, intro plays once per session (~1.5s).

---

## Asset list

Everything the site needs from a photographer or designer. Until a file exists, the site shows a designed placeholder in its place, so assets can arrive one at a time.

**General rules for every photo**

- Format: **JPG** (or WebP), sRGB, quality ~80. Sizes below are exact pixel dimensions and are already 2× for retina screens.
- Weight: hero ≤ 450 KB, everything else ≤ 300 KB.
- Mood: dark, low-key, warm light. The site background is near-black (`#0D0C0B`), so photos should sit on dark backgrounds — no bright white studio sweeps.
- **Safe zone:** the same image is cropped differently on phone and desktop (noted per row). Keep the subject inside the central area described, with nothing important near the edges.
- After adding a file, flip its `ready` flag to `true` in `src/config/assets.ts` (see [Replacing images](#replacing-images)).

### 1. Home hero — 2 files

| File | Size (px) | Ratio | Where it shows | Composition |
| --- | --- | --- | --- | --- |
| `public/images/hero/hero.jpg` | **2560 × 1600** | 16:10 | Full-screen behind the headline, desktop & tablet | Subject (cup / pour) in the **right half**; left 45% and bottom 35% should be dark and quiet — the headline and buttons sit there. |
| `public/images/hero/hero-mobile.jpg` | **1080 × 1920** | 9:16 | Full-screen on phones | Subject in the **upper half**; bottom 50% dark (text sits there). Then uncomment `mobileSrc` for the hero in `assets.ts`. |

### 2. Product images — per coffee (× 3 coffees: `honest-truth`, `dark-truth`, `bitter-truth`)

Folder: `public/images/products/<slug>/`

| File | Size (px) | Ratio | Where it shows | Composition |
| --- | --- | --- | --- | --- |
| `packshot.jpg` | **1600 × 2000** | 4:5 | Product cards, coffee-page hero, coffee list, cart, checkout, admin cover | The bag, front-on, centred, filling ~65% of the height, on a dark seamless background. Leave ≥ 10% space on every side (desktop crops slightly). |
| `campaign.jpg` | **2000 × 1500** | 4:3 | "Story" section on the coffee page (phones crop it to 4:5) | Lifestyle shot of that coffee. Subject in the **centre 60%** of the width. |
| `gallery-1.jpg` | **1200 × 1500** | 4:5 | Gallery, large left image | Detail — beans / texture. |
| `gallery-2.jpg` | **1200 × 1500** | 4:5 | Gallery, middle image | Brewing / pour. |
| `gallery-3.jpg` | **1200 × 1600** | 3:4 | Gallery, small right image | In the cup. |

That's **15 files** for the three coffees. Packshots matter most — they appear on almost every page.

### 3. Brand story — 4 files

Folder: `public/images/story/`

| File | Size (px) | Ratio | Where it shows | Composition |
| --- | --- | --- | --- | --- |
| `arabica.jpg` | **1600 × 2000** | 4:5 | "Visual story" chapters (home + story page) | Arabica beans / plant. |
| `robusta.jpg` | **1600 × 2000** | 4:5 | Same | Robusta beans / plant. |
| `blend.jpg` | **1600 × 2000** | 4:5 | Same | The two beans together. |
| `manifesto.jpg` | **2800 × 1575** | 16:9 | Story page banner (shown 21:9 on desktop, 16:9 on tablet, 4:5 on phones) and the home "story" section (4:3) | Subject in the **centre third** — it's cropped on all four sides depending on screen. |

### 4. Journal covers — 1 per article (4 today)

Folder: `public/images/journal/`, named after the article slug (`how-to-choose-your-coffee.jpg`, `arabica-vs-robusta.jpg`, `why-blends-exist.jpg`, `how-to-brew-better-coffee.jpg`).

| Size (px) | Ratio | Where it shows | Composition |
| --- | --- | --- | --- |
| **2400 × 1350** | 16:9 | Article banner (21:9 desktop, 4:3 phone) and journal cards (cropped to 4:5) | Subject dead centre — cards keep only the middle 45% of the width. |

### 5. Brand & sharing

| File | Size (px) | Format | Use |
| --- | --- | --- | --- |
| `public/favicon.svg` | vector | SVG | Browser tab icon. A "BT" placeholder exists — replace with the real mark. |
| `public/apple-touch-icon.png` | **180 × 180** | PNG, no transparency | iPhone home-screen icon. |
| `public/icon-192.png`, `public/icon-512.png` | **192 × 192**, **512 × 512** | PNG | Android / installable icon. |
| `public/og-image.jpg` | **1200 × 630** | JPG | Link preview on WhatsApp, Instagram, X, LinkedIn. Logo + one strong image; keep text inside the centre 1000 × 500. Then uncomment the `og:image` tag in `index.html`. |
| Logo (wordmark) | vector | SVG | Optional — the logo is currently set in type (`src/components/ui/Wordmark.tsx`). Send an SVG if there's a designed mark. |
| Razorpay checkout logo (v2) | **256 × 256** | PNG, square | Shown inside the Razorpay payment window. Upload in Razorpay Dashboard → Settings → Branding. |

### 6. Products added in the admin (v2)

Images uploaded at `/admin` → Products follow the **packshot** spec: **1600 × 2000 (4:5)**, JPG/PNG/WebP, max 5 MB, up to 12 per product. The first image is the cover.

### Checklist

| Group | Files |
| --- | --- |
| Hero | 2 |
| Products (3 × 5) | 15 |
| Story | 4 |
| Journal | 4 |
| Icons & sharing | 4 (+ optional logo SVG, Razorpay logo) |
| **Total** | **29** |
