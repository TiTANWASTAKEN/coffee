import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { getProduct, productThemeStyle } from "@/data/products";
import { CoffeeImage } from "@/components/product/CoffeeImage";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";
import { BuyButton } from "@/components/ui/BuyButton";
import { ease } from "@/lib/motion";
import { track } from "@/lib/analytics";

const options = [
  { id: "smooth", label: "Smooth & aromatic", hint: "Gentle, fragrant, easy to sip.", product: "honest-truth" },
  { id: "bold", label: "Bold & intense", hint: "Heavy, strong, no half measures.", product: "dark-truth" },
  { id: "balanced", label: "Balanced & complex", hint: "A little of both, held in check.", product: "bitter-truth" },
] as const;

type OptionId = (typeof options)[number]["id"];

export function CoffeeQuiz() {
  const [choice, setChoice] = useState<OptionId | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === choice);
  const product = selected ? getProduct(selected.product) : undefined;

  const choose = (id: OptionId) => {
    setChoice(id);
    const option = options.find((o) => o.id === id);
    track("quiz_result", { answer: id, product: option?.product });
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  };

  return (
    <section id="quiz" aria-labelledby="quiz-heading" className="scroll-mt-nav border-t border-line py-section">
      <div className="container-site grid gap-14 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Reveal variant="fadeIn">
            <p className="eyebrow flex items-center gap-4 text-muted">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              Which coffee are you?
            </p>
          </Reveal>
          <RevealText id="quiz-heading" lines={["What are you", "looking for?"]} className="mt-6 text-display-md font-light" />

          <Stagger className="mt-12 border-b border-line" gap={0.08}>
            {options.map((o, i) => {
              const active = choice === o.id;
              return (
                <StaggerItem key={o.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(o.id)}
                    className={`group flex w-full items-center justify-between gap-6 border-t border-line py-6 text-left transition-colors duration-500 ${
                      choice && !active ? "text-muted" : "text-ivory"
                    }`}
                  >
                    <span className="flex items-baseline gap-5">
                      <span className="eyebrow w-5 text-faint">0{i + 1}</span>
                      <span>
                        <span className="block font-display text-display-xs transition-transform duration-500 ease-[var(--ease-luxe)] can-hover:group-hover:translate-x-1.5">
                          {o.label}
                        </span>
                        <span className="mt-1 block text-body-sm text-muted">{o.hint}</span>
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition-colors duration-500 ${
                        active ? "border-ivory" : "border-line-strong group-hover:border-ivory/60"
                      }`}
                    >
                      <motion.span
                        className="block size-2.5 rounded-full bg-ivory"
                        initial={false}
                        animate={{ scale: active ? 1 : 0 }}
                        transition={{ duration: 0.4, ease }}
                      />
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>

        <div ref={resultRef} className="scroll-mt-nav lg:col-span-6 lg:col-start-7">
          <div
            aria-live="polite"
            style={product ? productThemeStyle(product) : undefined}
            className="relative min-h-[28rem] overflow-hidden border border-line bg-surface sm:min-h-[32rem]"
          >
            <AnimatePresence mode="wait" initial={false}>
              {product ? (
                <motion.div
                  key={product.id}
                  className="grid h-full sm:grid-cols-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <motion.div
                    className="relative aspect-[4/3] sm:aspect-auto sm:min-h-[32rem]"
                    initial={{ clipPath: "inset(0 100% 0 0)" }}
                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                    transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
                  >
                    <CoffeeImage product={product} className="absolute! inset-0 h-full w-full" sizes="(min-width: 640px) 25vw, 100vw" showTag={false} />
                  </motion.div>
                  <motion.div
                    className="flex flex-col p-7 md:p-9"
                    initial="hidden"
                    animate="visible"
                    variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
                  >
                    {[
                      <p key="e" className="eyebrow text-accent">You might be</p>,
                      <h3 key="h" className="mt-4 font-display text-display-sm font-light uppercase">
                        {product.name}.
                      </h3>,
                      <p key="b" className="label mt-3 font-medium text-muted">{product.blend}</p>,
                      <p key="t" className="mt-6 font-display text-xl italic text-ivory/85">{product.tagline}</p>,
                      <p key="d" className="mt-4 text-body-sm text-muted">{product.shortDescription}</p>,
                    ].map((el) => (
                      <motion.div key={el.key} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
                        {el}
                      </motion.div>
                    ))}
                    <motion.div
                      className="mt-auto flex flex-col gap-3 pt-8"
                      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6 } } }}
                    >
                      <ButtonLink to={`/coffee/${product.slug}`} size="sm" cursor="Explore" className="w-full">
                        Explore coffee
                      </ButtonLink>
                      <BuyButton product={product} variant="outline" size="sm" compact className="w-full" />
                      <button
                        type="button"
                        onClick={() => setChoice(null)}
                        className="label mt-1 inline-flex min-h-11 items-center justify-center gap-2 font-medium text-muted transition-colors hover:text-ivory"
                      >
                        <RotateCcw aria-hidden="true" strokeWidth={1.4} className="size-3.5" /> Start again
                      </button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <div aria-hidden="true" className="relative mb-10 h-24 w-40">
                    {[0, 1, 2].map((n) => (
                      <motion.span
                        key={n}
                        className="absolute top-1/2 size-20 -translate-y-1/2 rounded-full border border-line-strong"
                        style={{ left: `${n * 30}px` }}
                        animate={{ opacity: [0.35, 0.9, 0.35] }}
                        transition={{ duration: 3, repeat: Infinity, delay: n * 0.5, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                  <p className="eyebrow text-muted">Your truth</p>
                  <p className="mt-4 max-w-xs font-display text-display-xs font-light">Pick what you’re in the mood for. We’ll be honest.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
