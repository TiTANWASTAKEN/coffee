import { site } from "@/config/site";

/** True when a URL is real (not empty and not a "#" placeholder). */
export function isLiveUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && url.trim() !== "" && url.trim() !== "#";
}

/**
 * Returns a ready-to-use Amazon href, or null while the link is a placeholder.
 * Tracking parameters from `site.amazonTracking` are appended automatically.
 */
export function amazonHref(url: string | null | undefined): string | null {
  if (!isLiveUrl(url)) return null;
  const params = Object.entries(site.amazonTracking);
  if (params.length === 0) return url;
  try {
    const parsed = new URL(url);
    for (const [key, value] of params) parsed.searchParams.set(key, value);
    return parsed.toString();
  } catch {
    return url;
  }
}
