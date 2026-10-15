import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import { AnimatePresence } from "framer-motion";
import { storeEnabled, waitlistEnabled } from "@/config/features";
import { Layout } from "@/components/layout/Layout";
import { AccountProvider } from "@/store/account";
import { CatalogProvider } from "@/store/catalog";
import { CartProvider } from "@/store/cart";
import Home from "@/pages/Home";
import Waitlist from "@/pages/Waitlist";
import Coffee from "@/pages/Coffee";
import Product from "@/pages/Product";
import Shop from "@/pages/Shop";
import ShopProduct from "@/pages/ShopProduct";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import TrackOrder from "@/pages/TrackOrder";
import Story from "@/pages/Story";
import Journal from "@/pages/Journal";
import JournalArticle from "@/pages/JournalArticle";
import Legal from "@/pages/Legal";
import NotFound from "@/pages/NotFound";
import Account from "@/pages/account/Account";
import Login from "@/pages/account/Login";
import Register from "@/pages/account/Register";
import ForgotPassword from "@/pages/account/ForgotPassword";
import ResetPassword from "@/pages/account/ResetPassword";

const AdminApp = lazy(() => import("@/admin/AdminApp"));

export default function App() {
  const location = useLocation();

  if (location.pathname === "/admin" || location.pathname.startsWith("/admin/")) {
    return (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <AccountProvider>
      <CatalogProvider>
        <CartProvider>
          <Layout>
            <AnimatePresence mode="wait" initial={false}>
              {waitlistEnabled ? (
                <Routes location={location} key={location.pathname}>
                  <Route path="/legal/:slug" element={<Legal />} />
                  <Route path="*" element={<Waitlist />} />
                </Routes>
              ) : (
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                <Route path="/coffee" element={<Coffee />} />
                <Route path="/coffee/:slug" element={<Product />} />
                {storeEnabled && (
                  <>
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/shop/:slug" element={<ShopProduct />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order/:id" element={<OrderConfirmation />} />
                    <Route path="/track-order" element={<TrackOrder />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/account/login" element={<Login />} />
                    <Route path="/account/register" element={<Register />} />
                    <Route path="/account/forgot" element={<ForgotPassword />} />
                    <Route path="/account/reset" element={<ResetPassword />} />
                  </>
                )}
                <Route path="/story" element={<Story />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/journal/:slug" element={<JournalArticle />} />
                <Route path="/legal/:slug" element={<Legal />} />                <Route path="*" element={<NotFound />} />
              </Routes>
              )}
            </AnimatePresence>
          </Layout>
        </CartProvider>
      </CatalogProvider>
    </AccountProvider>
  );
}
