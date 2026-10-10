import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoreProductCard } from "@/components/shop/StoreProductCard";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { Button } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useCatalog } from "@/store/catalog";

export default function Shop() {
  useDocumentTitle("Shop");
  const { status, products, refresh } = useCatalog();

  return (
    <PageTransition>
      <PageHeader eyebrow="Shop" title={["Everything", "we make."]} intro="Order direct. Secure checkout with Razorpay — UPI, cards and netbanking." />

      <section aria-label="Products" className="container-site pb-section">
        {status === "loading" && <p className="border-t border-line pt-10 text-muted">Loading products…</p>}

        {status === "error" && (
          <div className="flex flex-col items-start gap-6 border-t border-line pt-10">
            <p className="text-muted">We couldn’t load the shop right now.</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Try again
            </Button>
          </div>
        )}

        {status === "ready" && products.length === 0 && <p className="border-t border-line pt-10 text-muted">Nothing for sale yet. Check back soon.</p>}

        {status === "ready" && products.length > 0 && (
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" gap={0.08}>
            {products.map((p) => (
              <StaggerItem key={p.id}>
                <StoreProductCard product={p} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </PageTransition>
  );
}
