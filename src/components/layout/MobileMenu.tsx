import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { storeEnabled } from "@/config/features";
import { primaryNav, site } from "@/config/site";
import { useAccount } from "@/store/account";
import { products } from "@/data/products";
import { ExternalLink } from "@/components/ui/ExternalLink";
import { ease, easeCurtain } from "@/lib/motion";

export function MobileMenu({ open }: { open: boolean }) {
  const firstLink = useRef<HTMLAnchorElement>(null);
  const { customer } = useAccount();

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => firstLink.current?.focus({ preventScroll: true }), 350);
    return () => {
      window.clearTimeout(t);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-label="Menu"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink pt-nav lg:hidden"
          initial={{ clipPath: "inset(0 0 100% 0)" }}
          animate={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 0.7, ease: easeCurtain }}
        >
          <nav aria-label="Mobile" className="container-site flex flex-1 flex-col justify-center py-10">
            <motion.ul
              className="flex flex-col"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } } }}
            >
              {primaryNav.map((item, i) => (
                <li key={item.to} className="overflow-hidden border-b border-line">
                  <motion.div
                    variants={{ hidden: { y: "100%" }, visible: { y: "0%", transition: { duration: 0.8, ease } } }}
                  >
                    <Link
                      ref={i === 0 ? firstLink : undefined}
                      to={item.to}
                      className="flex items-baseline gap-5 py-5 font-display text-[clamp(2.5rem,11vw,4.5rem)] font-light uppercase leading-none tracking-[-0.02em]"
                    >
                      <span className="eyebrow w-6 font-sans text-muted">0{i + 1}</span>
                      {item.label}
                    </Link>
                  </motion.div>
                </li>
              ))}
            </motion.ul>
          </nav>

          <motion.div
            className="container-site grid grid-cols-2 gap-8 border-t border-line py-8 text-body-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.55, duration: 0.6 } }}
          >
            <div>
              <p className="eyebrow mb-4 text-faint">The Coffee</p>
              <ul className="flex flex-col gap-2">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link to={`/coffee/${p.slug}`} className="text-muted transition-colors hover:text-ivory">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {storeEnabled && (
                <>
                  <p className="eyebrow mb-4 text-faint">Account</p>
                  <Link to={customer ? "/account" : "/account/login"} className="mb-8 block text-muted transition-colors hover:text-ivory">
                    {customer ? "Your orders" : "Sign in"}
                  </Link>
                </>
              )}
              <p className="eyebrow mb-4 text-faint">Follow</p>
              <ul className="flex flex-col gap-2 text-muted">
                {site.social.map((s) => (
                  <li key={s.label}>
                    <ExternalLink href={s.href}>{s.label}</ExternalLink>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
