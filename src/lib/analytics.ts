/**
 * Analytics seam. Every meaningful interaction calls `track()`.
 * Wire GA4 / Meta Pixel / anything else in here later — components
 * won't need to change.
 */

type EventName = "buy_click" | "quiz_result" | "search" | "add_to_cart" | "begin_checkout" | "purchase";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function track(event: EventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer?.push({ event, ...payload });
}
