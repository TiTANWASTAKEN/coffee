import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { MotionConfig } from "framer-motion";
import { IntroProvider } from "./Intro";
import { Navbar } from "./Navbar";
import { MobileMenu } from "./MobileMenu";
import { SearchOverlay } from "./SearchOverlay";
import { Footer } from "./Footer";
import { GrainOverlay } from "./GrainOverlay";
import { CustomCursor } from "./CustomCursor";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { storeEnabled } from "@/config/features";
import { useLockScroll } from "@/hooks/useLockScroll";
import { useCart } from "@/store/cart";
import { Seo } from "@/seo/Seo";

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const cart = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const lastPath = useRef(location.pathname);
  const closeCart = cart.close;

  // Close overlays on navigation; smooth-scroll for same-page hash links.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    closeCart();
    const samePage = lastPath.current === location.pathname;
    lastPath.current = location.pathname;
    if (samePage && location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      target?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location.pathname, location.hash, location.key, closeCart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        closeCart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeCart]);

  useLockScroll(menuOpen || searchOpen || cart.isOpen);
  const overlayOpen = menuOpen || searchOpen || cart.isOpen;

  return (
    <MotionConfig reducedMotion="user">
      <Seo />
      <IntroProvider>
        <button
          type="button"
          onClick={() => mainRef.current?.focus()}
          className="label fixed left-4 top-4 z-[95] -translate-y-24 bg-ivory px-5 py-3 text-ink transition-transform focus:translate-y-0"
        >
          Skip to content
        </button>

        <Navbar
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((v) => !v)}
          onSearchOpen={() => {
            setMenuOpen(false);
            setSearchOpen(true);
          }}
          onCartOpen={() => {
            setMenuOpen(false);
            cart.open();
          }}
          inert={searchOpen || cart.isOpen}
        />
        <MobileMenu open={menuOpen} />
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        {storeEnabled && <CartDrawer />}

        <main id="main" ref={mainRef} tabIndex={-1} inert={overlayOpen} className="outline-none">
          {children}
        </main>
        <Footer inert={overlayOpen} />

        <GrainOverlay />
        <CustomCursor />
      </IntroProvider>
    </MotionConfig>
  );
}
