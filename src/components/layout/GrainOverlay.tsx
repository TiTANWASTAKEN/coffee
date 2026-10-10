const noise =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/**
 * Site-wide film grain. Static, no blend mode, and kept on its own GPU layer
 * so scrolling and animations underneath never force it to repaint.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] transform-gpu opacity-[0.035] will-change-transform"
      style={{ backgroundImage: noise, backgroundSize: "180px 180px" }}
    />
  );
}
