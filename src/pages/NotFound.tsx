import { motion } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";
import { RevealText } from "@/components/motion/RevealText";
import { ButtonLink } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ease } from "@/lib/motion";

export default function NotFound() {
  useDocumentTitle("Not found");
  return (
    <PageTransition>
      <section className="relative grid min-h-[100svh] place-items-center overflow-hidden pt-nav">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid select-none place-items-center font-display text-[46vw] font-light leading-none text-ivory/[0.025]"
        >
          404
        </span>
        <div className="container-site relative flex flex-col items-center text-center">
          <motion.p className="eyebrow text-muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease }}>
            Error 404
          </motion.p>
          <RevealText as="h1" play delay={0.1} lines={["Nothing here."]} className="mt-8 text-display-xl font-light uppercase" />
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.35 }}
          >
            <p className="mt-8 text-lead text-muted">Looks like this truth got lost.</p>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/coffee">See the coffee</ButtonLink>
              <ButtonLink to="/" variant="outline" icon="none">
                Back home
              </ButtonLink>
            </div>
          </motion.div>
        </div>
      </section>
    </PageTransition>
  );
}
