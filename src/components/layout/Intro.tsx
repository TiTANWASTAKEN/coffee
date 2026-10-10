import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/config/site";
import { ease, easeCurtain } from "@/lib/motion";
import { useLockScroll } from "@/hooks/useLockScroll";

const STORAGE_KEY = "ht-intro-seen";
const IntroContext = createContext({ introDone: true });

/** True once the loading sequence has lifted (or immediately if it was skipped). */
export function useIntro() {
  return useContext(IntroContext);
}

function shouldPlayIntro() {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return false;
  } catch {
    /* storage unavailable — play once per load */
  }
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function IntroProvider({ children }: { children: ReactNode }) {
  const [play] = useState(shouldPlayIntro);
  const [introDone, setIntroDone] = useState(!play);

  const onReveal = useCallback(() => {
    setIntroDone(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <IntroContext.Provider value={{ introDone }}>
      {play && <Loader onReveal={onReveal} />}
      {children}
    </IntroContext.Provider>
  );
}

/** Short first-visit sequence: wordmark → tagline → curtain lift. ~1.6s total. */
function Loader({ onReveal }: { onReveal: () => void }) {
  const [visible, setVisible] = useState(true);
  useLockScroll(visible);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setVisible(false);
      onReveal();
    }, 1500);
    return () => window.clearTimeout(t);
  }, [onReveal]);

  // Animated letter by letter, but grouped by word so the name wraps cleanly on narrow screens.
  let offset = 0;
  const words = site.name
    .toUpperCase()
    .split(" ")
    .map((word) => {
      const start = offset;
      offset += word.length;
      return { word, start };
    });

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loader"
          aria-hidden="true"
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-ink will-change-transform"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: easeCurtain }}
        >
          <motion.div exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4, ease }} className="flex flex-col items-center">
            <div className="flex max-w-[90vw] flex-wrap justify-center gap-x-[0.6em] gap-y-2 px-4 font-display text-[clamp(1.6rem,5vw,3.25rem)] font-light uppercase tracking-[0.28em]">
              {words.map(({ word, start }) => (
                <span key={start} className="flex overflow-hidden">
                  {word.split("").map((l, i) => (
                    <motion.span
                      key={i}
                      className="inline-block"
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{ duration: 0.8, ease, delay: 0.1 + (start + i) * 0.03 }}
                    >
                      {l}
                    </motion.span>
                  ))}
                </span>
              ))}
            </div>
            <motion.div
              className="mt-7 h-px w-24 origin-left bg-line-strong"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, ease, delay: 0.45 }}
            />
            <motion.p
              className="eyebrow mt-6 text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease, delay: 0.65 }}
            >
              Coffee without the pretence
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
