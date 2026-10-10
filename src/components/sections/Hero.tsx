import { useRef, type PointerEvent } from "react";
import { Link } from "react-router";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { assets } from "@/config/assets";
import { products } from "@/data/products";
import { SmartImage } from "@/components/media/SmartImage";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";
import { useIntro } from "@/components/layout/Intro";
import { useFontsReady } from "@/hooks/useFontsReady";
import { useFinePointer } from "@/hooks/useMediaQuery";
import { ease } from "@/lib/motion";

const MAX_SHIFT = 10; // px — pointer parallax range

export function Hero() {
  const { introDone: introLifted } = useIntro();
  const fontsReady = useFontsReady();
  const introDone = introLifted && fontsReady;
  const fine = useFinePointer();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "24%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 50, damping: 18 });
  const sy = useSpring(py, { stiffness: 50, damping: 18 });

  // Normalised against the viewport so the handler never forces a layout read.
  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (!fine || reduce || e.pointerType !== "mouse") return;
    px.set((e.clientX / window.innerWidth - 0.5) * -2 * MAX_SHIFT);
    py.set((e.clientY / window.innerHeight - 0.5) * -2 * MAX_SHIFT);
  };

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: introDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
    transition: { duration: 0.9, ease, delay },
  });

  return (
    <section
      ref={ref}
      onPointerMove={onPointerMove}
      aria-labelledby="hero-heading"
      className="relative h-[92svh] min-h-[560px] overflow-hidden md:h-[100svh] md:min-h-[640px]"
    >
      {/* Visual — scroll parallax › pointer parallax + slow settle.
          Both layers are GPU-promoted so the artwork is painted once and only composited after. */}
      <motion.div className="absolute inset-0 will-change-transform" style={{ y: imageY }}>
        <motion.div
          className="absolute -inset-[3%] will-change-transform"
          style={{ x: sx, y: sy }}
          initial={{ scale: 1.14 }}
          animate={{ scale: introDone ? 1.03 : 1.14 }}
          transition={{ duration: 2.8, ease }}
        >
          <SmartImage
            asset={assets.hero.main}
            priority
            className="h-full w-full"
            artClassName="left-[62%] top-[24%] w-[104vw] -translate-x-1/2 -translate-y-1/2 md:left-[64%] md:top-[30%] md:w-[84vw] lg:left-[72%] lg:top-[47%] lg:w-[min(78vh,48vw)]"
            tagClassName="right-[calc(var(--spacing-gutter)_+_3%)] top-32 flex-col items-end gap-1.5"
          />
        </motion.div>
      </motion.div>

      {/* Legibility gradients */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-linear-to-b from-ink/70 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[78%] bg-linear-to-t from-ink via-ink/75 to-transparent lg:h-[70%] lg:via-ink/60" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgb(13_12_11/0.9),rgb(13_12_11/0.35)_50%,transparent_75%)] lg:block"
      />

      {/* Copy */}
      <motion.div
        className="container-site relative z-10 flex h-full flex-col justify-end pb-28 will-change-[transform,opacity] md:pb-[17vh]"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <motion.p className="eyebrow flex items-center gap-4 text-ivory/75" {...reveal(0.1)}>
          <span aria-hidden="true" className="h-px w-8 bg-beige" />
          Coffee without the pretence
        </motion.p>

        <RevealText
          as="h1"
          id="hero-heading"
          play={introDone}
          delay={0.2}
          stagger={0.12}
          lines={["Truth,", "in every cup."]}
          className="mt-7 font-display text-[clamp(2.4rem,12vw,11rem)] font-light uppercase leading-[0.88] tracking-[-0.03em]"
        />

        <motion.p className="mt-8 max-w-sm text-lead text-ivory/75" {...reveal(0.45)}>
          Three coffees. Three personalities. Nothing hidden.
        </motion.p>

        <motion.div className="mt-10 flex flex-col gap-3 sm:flex-row" {...reveal(0.5)}>
          <ButtonLink to="/coffee" cursor="Explore">
            Explore the coffee
          </ButtonLink>
          <ButtonLink to="/story" variant="outline" icon="none">
            Our story
          </ButtonLink>
        </motion.div>
      </motion.div>

      {/* Bottom rail */}
      <motion.div
        className="container-site absolute inset-x-0 bottom-0 z-10 flex items-end justify-between pb-7"
        initial={{ opacity: 0 }}
        animate={{ opacity: introDone ? 1 : 0 }}
        transition={{ duration: 1, delay: 0.8 }}
      >
        <div className="flex items-center gap-4 text-ivory/60" aria-hidden="true">
          <span className="relative block h-10 w-px overflow-hidden bg-line">
            <span className="absolute inset-0 bg-ivory [animation:scroll-cue_2.2s_cubic-bezier(0.65,0,0.35,1)_infinite]" />
          </span>
          <span className="eyebrow">Scroll</span>
        </div>
        <ul className="hidden items-center gap-2 md:flex" aria-label="The coffees">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                to={`/coffee/${p.slug}`}
                data-cursor="View"
                className="eyebrow group/rail flex min-h-11 items-center px-3 text-ivory/55 transition-colors duration-300 hover:text-ivory"
              >
                <span className="mr-2 text-ivory/30 transition-colors duration-300 group-hover/rail:text-accent">{p.number}</span>
                <span className="link-underline">{p.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
