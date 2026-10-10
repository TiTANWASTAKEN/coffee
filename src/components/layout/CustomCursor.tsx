import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useFinePointer } from "@/hooks/useMediaQuery";

const INTERACTIVE = "[data-cursor], a[href], button, [role='button'], [role='radio'], [role='tab'], label, select, summary, input[type='checkbox'], input[type='radio']";
const TEXT_FIELD = "input:not([type='checkbox'], [type='radio'], [type='range'], [type='submit'], [type='button']), textarea, [contenteditable='true']";

/** Share of the remaining distance the ring covers per 60 Hz frame (scaled for other refresh rates). */
const FOLLOW = 0.26;

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

    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const tick = (now: number) => {
      const dt = lastTime ? Math.min(now - lastTime, 64) : 16.667;
      lastTime = now;
      const k = 1 - Math.pow(1 - FOLLOW, dt / 16.667);
      ringPos.x += (target.x - ringPos.x) * k;
      ringPos.y += (target.y - ringPos.y) * k;
      place(ring, ringPos.x, ringPos.y);

      if (Math.abs(target.x - ringPos.x) + Math.abs(target.y - ringPos.y) > 0.1) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        lastTime = 0;
      }
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
    };

    const onOver = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(TEXT_FIELD)) {
        // The native I-beam takes over inside text fields.
        root.dataset.state = "text";
        return;
      }
      const el = target?.closest?.(INTERACTIVE);
      const usable = Boolean(el) && !el!.matches(":disabled, [aria-disabled='true']");
      const text = usable ? el!.getAttribute("data-cursor") : null;
      root.dataset.state = text ? "label" : usable ? "active" : "idle";
      if (text) label.textContent = text;
    };

    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget) root.dataset.visible = "false";
    };
    const onDown = () => (root.dataset.pressed = "true");
    const onUp = () => (root.dataset.pressed = "false");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      html.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
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
      className="group/cursor pointer-events-none fixed left-0 top-0 z-[100] opacity-0 transition-opacity duration-200 data-[visible=true]:opacity-100 data-[state=text]:opacity-0!"
    >
      {/* Trailing ring + label bubble */}
      <div ref={ringRef} className="absolute left-0 top-0 will-change-transform">
        <div className="transition-[scale] duration-300 ease-luxe group-data-[pressed=true]/cursor:scale-[0.82]">
          <div className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/35 shadow-[0_0_0_1px_rgb(13_12_11/0.3)] transition-[scale,opacity,border-color] duration-500 ease-luxe group-data-[state=active]/cursor:scale-[1.5] group-data-[state=active]/cursor:border-ivory/80 group-data-[state=label]/cursor:scale-[2.2] group-data-[state=label]/cursor:opacity-0" />
          <div className="absolute grid size-[84px] -translate-x-1/2 -translate-y-1/2 scale-[0.3] place-items-center rounded-full bg-ivory text-ink opacity-0 transition-[scale,opacity] duration-500 ease-luxe group-data-[state=label]/cursor:scale-100 group-data-[state=label]/cursor:opacity-100">
            <span ref={labelRef} className="eyebrow text-[9px]! font-semibold" />
          </div>
        </div>
      </div>

      {/* Dot — pinned to the pointer */}
      <div ref={dotRef} className="absolute left-0 top-0 will-change-transform">
        <div className="size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory shadow-[0_0_0_1px_rgb(13_12_11/0.35)] transition-[scale] duration-300 ease-luxe group-data-[state=active]/cursor:scale-[0.6] group-data-[state=label]/cursor:scale-0" />
      </div>
    </div>
  );
}
