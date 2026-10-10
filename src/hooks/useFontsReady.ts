import { useEffect, useState } from "react";

/**
 * True once web fonts have loaded (or after `timeoutMs`, so a slow network never
 * blocks content). Lets big headline reveals start after the font swap instead of
 * animating in the fallback font and then jumping.
 */
export function useFontsReady(timeoutMs = 900): boolean {
  const [ready, setReady] = useState(() => typeof document === "undefined" || !document.fonts || document.fonts.status === "loaded");

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    const done = () => !cancelled && setReady(true);
    const timer = window.setTimeout(done, timeoutMs);
    document.fonts.ready.then(done, done);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, timeoutMs]);

  return ready;
}
