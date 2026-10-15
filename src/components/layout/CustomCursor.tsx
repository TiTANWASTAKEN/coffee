import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useFinePointer } from "@/hooks/useMediaQuery";

const INTERACTIVE = "[data-cursor], a[href], button, [role='button'], [role='radio'], [role='tab'], label, select, summary, input[type='checkbox'], input[type='radio']";
const TEXT_FIELD = "input:not([type='checkbox'], [type='radio'], [type='range'], [type='submit'], [type='button']), textarea, [contenteditable='true']";

/** Ring eases toward the pointer with this half-life (ms). Short enough to feel attached, long enough not to twitch. */
const RING_HALF_LIFE = 42;

/**
 * Desktop-only cursor: a dot pinned to the pointer and a ring that eases after it.
 * Elements can request a label with data-cursor="View" / "Shop" / "Explore".
 *
 * Runs outside React state: positions are written straight to `transform` and
 * hover states are data attributes, so moving the mouse never re-renders.
 */
export function CustomCursor() {
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const enabled = fine && !reduce;

  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!enabled || !root || !dot || !ring || !label) return;

    const html = document.documentElement;
    html.classList.add("has-custom-cursor");

    const target = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let frame = 0;
    let lastTime = 0;
    let hovering = "";

    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const tick = (now: number) => {
      const dt = lastTime ? Math.min(now - lastTime, 32) : 16;
      lastTime = now;
      const k = 1 - Math.exp(-dt / RING_HALF_LIFE);
      const dx = target.x - ringPos.x;
      const dy = target.y - ringPos.y;
      ringPos.x += dx * k;
      ringPos.y += dy * k;
      // Snap the last fraction of a pixel so the ring doesn't shimmer once it's home.
      if (Math.abs(dx) + Math.abs(dy) < 0.4) {
        ringPos.x = target.x;
        ringPos.y = target.y;
      }
      place(ring, ringPos.x, ringPos.y);

      if (ringPos.x !== target.x || ringPos.y !== target.y) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        lastTime = 0;
      }
    };

    const setHover = (state: string, text: string | null) => {
      const key = `${state}\0${text ?? ""}`;
      if (key === hovering) return;
      hovering = key;
      root.dataset.state = state;
      if (text) label.textContent = text;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      place(dot, target.x, target.y);
      if (root.dataset.visible !== "true") {
        // Appear in place rather than sliding in from the last known position.
        ringPos.x = target.x;
        ringPos.y = target.y;
        place(ring, ringPos.x, ringPos.y);
        root.dataset.visible = "true";
      }
      if (!frame) frame = requestAnimationFrame(tick);

      const node = e.target as Element | null;
      if (node?.closest?.(TEXT_FIELD)) {
        setHover("text", null);
        return;
      }
      const el = node?.closest?.(INTERACTIVE);
      const usable = Boolean(el) && !el!.matches(":disabled, [aria-disabled='true']");
      const text = usable ? el!.getAttribute("data-cursor") : null;
      setHover(text ? "label" : usable ? "active" : "idle", text);
    };

    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) root.dataset.visible = "false";
    };
    const onDown = () => (root.dataset.pressed = "true");
    const onUp = () => (root.dataset.pressed = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      html.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-state="idle"
      data-visible="false"
      data-pressed="false"
      className="group/cursor pointer-events-none fixed left-0 top-0 z-[100] opacity-0 transition-opacity duration-150 data-[visible=true]:opacity-100 data-[state=text]:opacity-0!"
    >
      {/* Trailing ring + label bubble. Hover scale lives on the children so it never rewrites the position transform. */}
      <div ref={ringRef} className="absolute left-0 top-0 will-change-transform">
        <div className="transition-transform duration-200 ease-luxe group-data-[pressed=true]/cursor:scale-[0.86]">
          <div className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/40 transition-[scale,opacity,border-color] duration-200 ease-luxe group-data-[state=active]/cursor:scale-125 group-data-[state=active]/cursor:border-ivory/80 group-data-[state=label]/cursor:scale-150 group-data-[state=label]/cursor:opacity-0" />
          <div className="absolute grid size-16 -translate-x-1/2 -translate-y-1/2 scale-50 place-items-center rounded-full bg-ivory text-ink opacity-0 transition-[scale,opacity] duration-200 ease-luxe group-data-[state=label]/cursor:scale-100 group-data-[state=label]/cursor:opacity-100">
            <span ref={labelRef} className="eyebrow text-[9px]! font-semibold" />
          </div>
        </div>
      </div>

      {/* Dot — pinned to the pointer */}
      <div ref={dotRef} className="absolute left-0 top-0 will-change-transform">
        <div className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory transition-transform duration-200 ease-luxe group-data-[state=active]/cursor:scale-50 group-data-[state=label]/cursor:scale-0" />
      </div>
    </div>
  );
}
