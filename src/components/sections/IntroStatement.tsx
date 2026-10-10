import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";

const statement = "Coffee doesn’t need to pretend.";

const points = [
  { n: "01", title: "Three coffees", text: "Each with a personality of its own." },
  { n: "02", title: "Nothing hidden", text: "The beans are on the bag. That’s it." },
  { n: "03", title: "Your call", text: "Smooth, bold, or somewhere between." },
];

function Word({ children, progress, range }: { children: ReactNode; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.22em] inline-block will-change-[opacity]">
      {children}
    </motion.span>
  );
}

/** Editorial statement whose words light up as you scroll. */
export function IntroStatement() {
  const ref = useRef<HTMLHeadingElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.9", "end 0.5"] });
  const words = statement.split(" ");

  return (
    <section aria-labelledby="intro-heading" className="py-section">
      <div className="container-site grid gap-12 lg:grid-cols-12">
        <Reveal variant="fadeIn" className="lg:col-span-3">
          <p className="eyebrow flex items-center gap-4 text-muted lg:pt-6">
            <span aria-hidden="true" className="h-px w-8 bg-accent" />
            Our position
          </p>
        </Reveal>

        <div className="lg:col-span-9">
          <h2 ref={ref} id="intro-heading" className="text-display-lg font-light">
            {words.map((word, i) => (
              <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
                {word}
              </Word>
            ))}
          </h2>

          <Reveal className="mt-12 md:mt-16">
            <p className="max-w-2xl text-lead text-muted">
              We believe coffee should taste like what it is. Honest, bold, expressive and unapologetically itself.
            </p>
          </Reveal>

          <Stagger className="mt-16 grid border-t border-line sm:grid-cols-3 md:mt-24" gap={0.12}>
            {points.map((p) => (
              <StaggerItem key={p.n} className="border-b border-line py-7 sm:border-b-0 sm:pr-8 sm:pt-8">
                <p className="eyebrow text-faint">{p.n}</p>
                <h3 className="mt-4 font-display text-display-xs">{p.title}</h3>
                <p className="mt-2 text-body-sm text-muted">{p.text}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
