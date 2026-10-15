import { useState } from "react";
import { Link, NavLink } from "react-router";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { primaryNav, site } from "@/config/site";
import { Wordmark } from "@/components/ui/Wordmark";
import { ease } from "@/lib/motion";
import { storeEnabled, waitlistEnabled } from "@/config/features";
import { useAccount } from "@/store/account";
import { useCart } from "@/store/cart";

interface NavbarProps {
  menuOpen: boolean;
  onMenuToggle: () => void;
  onSearchOpen: () => void;
  onCartOpen: () => void;
  inert?: boolean;
}

export function Navbar({ menuOpen, onMenuToggle, onSearchOpen, onCartOpen, inert }: NavbarProps) {
  const { count } = useCart();
  const { customer } = useAccount();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(current > 24);
    if (current > previous && current > 520) setHidden(true);
    else if (current < previous - 2) setHidden(false);
  });

  const solid = scrolled && !menuOpen;

  return (
    <motion.header
      inert={inert}
      className="fixed inset-x-0 top-0 z-50"
      initial={false}
      animate={{ y: hidden && !menuOpen ? "-100%" : "0%" }}
      transition={{ duration: 0.6, ease }}
    >
      <div
        className={`border-b transition-[background-color,border-color] duration-700 ${
          solid ? "border-line bg-ink/85 backdrop-blur-md" : "border-transparent bg-transparent"
        }`}
      >
        <nav aria-label="Primary" className="container-site grid h-nav grid-cols-[1fr_auto] items-center lg:grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="justify-self-start py-3" aria-label={`${site.name} — home`}>
            <Wordmark />
          </Link>

          <ul className="hidden items-center gap-11 lg:flex">
            {primaryNav.map((item) => {
              const className = "label link-underline py-2 font-medium text-ivory/80 transition-colors hover:text-ivory aria-[current=page]:text-ivory";
              return (
                <li key={item.to}>
                  {item.to.includes("#") ? (
                    <Link to={item.to} className={className}>
                      {item.label}
                    </Link>
                  ) : (
                    <NavLink to={item.to} className={className}>
                      {item.label}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-end gap-1">
            {!waitlistEnabled && (
              <button
                type="button"
                onClick={onSearchOpen}
                aria-label="Search"
                className="grid size-11 place-items-center text-ivory/80 transition-colors hover:text-ivory"
              >
                <Search aria-hidden="true" strokeWidth={1.4} className="size-[18px]" />
              </button>
            )}
            {storeEnabled && (
              <>
                <Link
                  to={customer ? "/account" : "/account/login"}
                  aria-label={customer ? `Your account (${customer.name})` : "Sign in"}
                  className="relative hidden size-11 place-items-center text-ivory/80 transition-colors hover:text-ivory sm:grid"
                >
                  <UserRound aria-hidden="true" strokeWidth={1.4} className="size-[18px]" />
                  {customer && <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-accent" />}
                </Link>
                <button
                  type="button"
                  onClick={onCartOpen}
                  aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
                  className="relative grid size-11 place-items-center text-ivory/80 transition-colors hover:text-ivory"
                >
                  <ShoppingBag aria-hidden="true" strokeWidth={1.4} className="size-[18px]" />
                  {count > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute right-1 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ivory px-1 text-[10px] font-semibold leading-none text-ink tabular-nums"
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              </>
            )}
            {!waitlistEnabled && (
            <button
              type="button"
              onClick={onMenuToggle}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="relative grid size-11 place-items-center lg:hidden"
            >
              <span className="relative block h-3 w-6">
                <motion.span
                  className="absolute left-0 top-0 block h-px w-full bg-ivory"
                  animate={menuOpen ? { top: "50%", rotate: 45 } : { top: "0%", rotate: 0 }}
                  transition={{ duration: 0.4, ease }}
                />
                <motion.span
                  className="absolute bottom-0 left-0 block h-px w-full bg-ivory"
                  animate={menuOpen ? { bottom: "calc(50% - 1px)", rotate: -45 } : { bottom: "0%", rotate: 0 }}
                  transition={{ duration: 0.4, ease }}
                />
              </span>
            </button>
            )}
          </div>
        </nav>
      </div>
    </motion.header>
  );
}
