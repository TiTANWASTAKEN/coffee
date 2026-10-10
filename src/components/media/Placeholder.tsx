import type { CSSProperties } from "react";
import type { PlaceholderVariant, Tone } from "@/config/assets";
import { site } from "@/config/site";
import { products } from "@/data/products";

/**
 * Art-directed image placeholders. Pure CSS — no network requests.
 * They stand in for photography until real images are supplied.
 */

interface Palette {
  bg: string;
  glow: string;
  light: string;
  crema: string;
  liquid: string;
  bean: string;
  beanDark: string;
}

const palettes: Record<Tone, Palette> = {
  neutral: { bg: "#120f0d", glow: "rgb(138 101 75 / 0.32)", light: "rgb(244 240 232 / 0.07)", crema: "#a87a52", liquid: "#1b110b", bean: "#5e3d29", beanDark: "#21140c" },
  honest: { bg: "#14110e", glow: "rgb(217 199 163 / 0.2)", light: "rgb(244 240 232 / 0.08)", crema: "#c49b6c", liquid: "#26170e", bean: "#7a5236", beanDark: "#33200f" },
  dark: { bg: "#0e0d0c", glow: "rgb(130 112 100 / 0.2)", light: "rgb(244 240 232 / 0.05)", crema: "#6b4730", liquid: "#100a06", bean: "#3d2b20", beanDark: "#120c08" },
  bitter: { bg: "#140f0c", glow: "rgb(201 141 96 / 0.24)", light: "rgb(244 240 232 / 0.06)", crema: "#b07446", liquid: "#20130b", bean: "#6b3f25", beanDark: "#29180d" },
};

export interface PlaceholderProps {
  label: string;
  variant: PlaceholderVariant;
  tone: Tone;
  alt: string;
  className?: string;
  /** Positions/sizes the central artwork (e.g. move the hero cup to the right). */
  artClassName?: string;
  tagClassName?: string;
  showTag?: boolean;
}

export function Placeholder({
  label,
  variant,
  tone,
  alt,
  className,
  artClassName,
  tagClassName,
  showTag = true,
}: PlaceholderProps) {
  const p = palettes[tone];
  const background: CSSProperties = {
    containerType: "size",
    backgroundColor: p.bg,
    backgroundImage: `radial-gradient(120% 90% at 15% 0%, ${p.glow}, transparent 60%), radial-gradient(90% 70% at 100% 100%, rgb(90 57 40 / 0.16), transparent 70%)`,
  };

  return (
    <div role="img" aria-label={alt} className={`grain absolute inset-0 overflow-hidden ${className ?? ""}`} style={background}>
      {variant === "cup" && <CupArt p={p} className={artClassName} />}
      {variant === "packshot" && <PackArt tone={tone} className={artClassName} />}
      {variant === "beans" && <BeansArt p={p} className={artClassName} />}
      {variant === "pour" && <PourArt p={p} className={artClassName} />}
      {variant === "texture" && <TextureArt p={p} />}

      {/* soft vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_40%,transparent_55%,rgb(0_0_0/0.55))]" />

      {showTag && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute flex items-center gap-3 text-ivory/45 ${tagClassName ?? "inset-x-4 bottom-4 justify-between"}`}
        >
          <span className="eyebrow shrink-0 whitespace-nowrap text-[9px]! tracking-[0.3em]!">Image placeholder</span>
          <span className="eyebrow min-w-0 truncate text-[9px]! tracking-[0.3em]!">{label}</span>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */

function CupArt({ p, className }: { p: Palette; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute aspect-square ${className ?? "left-1/2 top-1/2 w-[min(64cqw,82cqh)] -translate-x-1/2 -translate-y-1/2"}`}
    >
      {/* cast shadow */}
      <div className="absolute inset-[-6%] translate-x-[9%] translate-y-[11%] rounded-full bg-[radial-gradient(closest-side,rgb(0_0_0/0.75),transparent)]" />
      {/* saucer */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 28% 24%, #8f877c 0%, #5a544c 32%, #2c2925 68%, #161412 100%)",
          boxShadow: "inset -10px -14px 40px rgb(0 0 0 / 0.5)",
        }}
      />
      <div className="absolute inset-[13%] rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.18), inset 6px 10px 30px rgb(0 0 0 / 0.35)" }} />
      {/* handle */}
      <div
        className="absolute left-[76%] top-[44%] h-[12%] w-[19%] rounded-full"
        style={{ background: "linear-gradient(180deg, #8a8278, #2f2b27)", boxShadow: "6px 8px 18px rgb(0 0 0 / 0.5)" }}
      />
      {/* cup rim */}
      <div
        className="absolute inset-[19%] rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 26%, #e9e2d6 0%, #a59d91 40%, #4a453f 85%, #2a2724 100%)",
          boxShadow: "10px 16px 40px rgb(0 0 0 / 0.6)",
        }}
      />
      {/* coffee */}
      <div
        className="absolute inset-[24.5%] rounded-full"
        style={{
          background: `radial-gradient(circle at 46% 44%, ${p.crema} 0%, color-mix(in oklab, ${p.crema} 55%, ${p.liquid}) 38%, ${p.liquid} 82%, #050302 100%)`,
          boxShadow: "inset 0 6px 14px rgb(0 0 0 / 0.6)",
        }}
      />
      {/* specular highlight */}
      <div className="absolute left-[33%] top-[31%] h-[9%] w-[16%] -rotate-[28deg] rounded-[50%] bg-[radial-gradient(closest-side,rgb(255_255_255/0.28),transparent)]" />
    </div>
  );
}

function PackArt({ tone, className }: { tone: Tone; className?: string }) {
  const product = products.find((x) => x.theme.tone === tone) ?? products[0];
  const { bg, fg, band } = product.theme.pack;
  const [first, ...rest] = product.name.toUpperCase().split(" ");

  return (
    <div aria-hidden="true" className={`absolute inset-0 ${className ?? ""}`}>
      {/* floor shadow */}
      <div className="absolute bottom-[10%] left-1/2 h-[7%] w-[52%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(0_0_0/0.8),transparent)]" />
      {/* pouch */}
      <div
        className="absolute left-1/2 top-[47%] flex h-[70%] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-t-[3px] rounded-b-[6px] @container"
        style={{
          aspectRatio: "0.7",
          backgroundColor: bg,
          color: fg,
          boxShadow: "0 50px 70px -30px rgb(0 0 0 / 0.75), inset 0 0 0 1px rgb(255 255 255 / 0.04)",
        }}
      >
        {/* crimp band */}
        <div
          className="h-[9%] shrink-0"
          style={{
            backgroundColor: band,
            backgroundImage: "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.14) 0 1px, transparent 1px 4px)",
          }}
        />
        <div className="flex flex-1 flex-col justify-between px-[11cqw] pb-[10cqw] pt-[9cqw]">
          <div className="flex items-center justify-between text-[4cqw] font-semibold uppercase tracking-[0.3em] opacity-70">
            <span>N°{product.number}</span>
            <span className="font-display text-[6cqw] tracking-[0.08em]">{site.monogram}</span>
          </div>
          <div>
            <div className="font-display text-[15cqw] font-light leading-[0.88] tracking-[-0.01em]">
              <span className="block">{first}</span>
              <span className="block">{rest.join(" ")}</span>
            </div>
            <div className="my-[6cqw] h-px w-[22cqw] bg-current opacity-40" />
            <div className="text-[3.8cqw] font-semibold uppercase tracking-[0.28em] opacity-80">{product.blend}</div>
          </div>
          <div className="text-[3.2cqw] uppercase tracking-[0.3em] opacity-50">Coffee without the pretence</div>
        </div>
        {/* fold shading */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.28),transparent_16%,rgb(255_255_255/0.07)_38%,transparent_58%,rgb(0_0_0/0.32))]" />
      </div>
    </div>
  );
}

const beans = [
  { x: 52, y: 40, s: 15, r: 24 },
  { x: 36, y: 50, s: 13, r: -38 },
  { x: 62, y: 58, s: 14, r: 72 },
  { x: 46, y: 64, s: 12, r: -12 },
  { x: 70, y: 36, s: 11, r: -56 },
  { x: 28, y: 32, s: 10, r: 12 },
  { x: 78, y: 66, s: 10, r: 30 },
  { x: 20, y: 62, s: 9, r: 64 },
  { x: 58, y: 22, s: 9, r: -20 },
];

function BeansArt({ p, className }: { p: Palette; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute left-1/2 top-1/2 aspect-square w-[min(100cqw,118cqh)] -translate-x-1/2 -translate-y-1/2 ${className ?? ""}`}
    >
      {beans.map((b, i) => (
        <span
          key={i}
          className="absolute aspect-[0.74] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.s}%`,
            rotate: `${b.r}deg`,
            background: `radial-gradient(ellipse at 34% 28%, color-mix(in oklab, ${p.bean} 75%, white) 0%, ${p.bean} 32%, ${p.beanDark} 85%)`,
            boxShadow: "8px 14px 22px rgb(0 0 0 / 0.55)",
          }}
        >
          <span className="absolute inset-y-[9%] left-[40%] w-[26%] rounded-[50%] border-l-2 border-black/70" />
          <span className="absolute inset-y-[14%] left-[46%] w-[20%] rounded-[50%] border-l border-white/10" />
        </span>
      ))}
    </div>
  );
}

function PourArt({ p, className }: { p: Palette; className?: string }) {
  return (
    <div aria-hidden="true" className={`absolute inset-0 ${className ?? ""}`}>
      <div className="absolute left-1/2 top-0 h-[70%] w-[40%] -translate-x-1/2" style={{ background: `radial-gradient(closest-side, ${p.glow}, transparent)` }} />
      <div
        className="absolute left-1/2 top-0 h-[60%] w-[1.4%] min-w-[3px] -translate-x-1/2 rounded-b-full"
        style={{ background: `linear-gradient(90deg, ${p.liquid}, ${p.crema} 50%, ${p.liquid})`, maskImage: "linear-gradient(to bottom, transparent, black 25%)" }}
      />
      <div
        className="absolute left-1/2 top-[60%] aspect-[3.2] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{ background: `radial-gradient(closest-side, ${p.crema}, ${p.liquid} 55%, transparent)` }}
      />
      {[46, 62, 82].map((w) => (
        <div
          key={w}
          className="absolute left-1/2 top-[60%] aspect-[3.2] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-ivory/10"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  );
}

function TextureArt({ p }: { p: Palette }) {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute left-[58%] top-[44%] aspect-square w-[min(78cqw,105cqh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/10" />
      <div className="absolute left-[58%] top-[44%] aspect-square w-[min(52cqw,70cqh)] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle at 40% 35%, ${p.crema}, ${p.liquid} 70%)`, opacity: 0.55 }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(115deg, transparent 35%, ${p.light} 48%, transparent 62%)` }} />
    </div>
  );
}
