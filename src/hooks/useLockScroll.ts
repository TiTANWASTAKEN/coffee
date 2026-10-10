import { useEffect } from "react";

let locks = 0;

/**
 * Locks page scroll while `locked` is true. Safe to use from several components at once.
 * The scrollbar's space is reserved by `scrollbar-gutter: stable` (index.css), so nothing —
 * including the fixed navbar — shifts sideways when the lock toggles.
 */
export function useLockScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const root = document.documentElement;
    locks += 1;
    if (locks === 1) root.style.overflow = "hidden";
    return () => {
      locks -= 1;
      if (locks === 0) root.style.overflow = "";
    };
  }, [locked]);
}
