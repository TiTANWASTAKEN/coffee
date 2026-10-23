/** Editorial coffees. Shop URLs for these slugs redirect to `/coffee/:slug`. */
export const coffeeSlugs = ["dark-truth", "honest-truth", "bitter-truth"] as const;

export type CoffeeSlug = (typeof coffeeSlugs)[number];
