import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { motion } from "framer-motion";
import { getProduct } from "@/data/products";
import { PageTransition } from "@/components/layout/PageTransition";
import { SmartImage } from "@/components/media/SmartImage";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { AddToCartButton } from "@/components/shop/AddToCartButton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatPrice } from "@/lib/format";
import { ease } from "@/lib/motion";
import { coverAsset, uploadedAsset, useCatalog } from "@/store/catalog";
import NotFound from "./NotFound";

/** Detail page for products added in the admin (coffees have their own editorial pages). */
export default function ShopProduct() {
  const { slug } = useParams();
  const { status, bySlug } = useCatalog();
  const product = bySlug(slug);
  const [active, setActive] = useState(0);
  const [quantity, setQuantity] = useState(1);
  useDocumentTitle(product?.name);

  if (slug && getProduct(slug)) return <Navigate to={`/coffee/${slug}`} replace />;
  if (status === "loading") return <div className="min-h-[100svh]" />;
  if (!product) return <NotFound />;

  const images = product.images.length > 0 ? product.images.map((src) => uploadedAsset(src, product.name)) : [coverAsset(product)];
  const current = images[Math.min(active, images.length - 1)];

  return (
    <PageTransition>
      <section className="container-site grid gap-10 pb-section pt-[calc(var(--spacing-nav)_+_3rem)] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <SmartImage asset={current} priority className="aspect-[4/5] w-full" sizes="(min-width: 1024px) 58vw, 100vw" />
          {images.length > 1 && (
            <ul className="mt-4 grid grid-cols-5 gap-3">
              {images.map((img, i) => (
                <li key={img.src}>
                  <button
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Show image ${i + 1}`}
                    aria-current={i === active}
                    className={`block w-full border transition-colors ${i === active ? "border-ivory" : "border-transparent hover:border-line-strong"}`}
                  >
                    <SmartImage asset={img} className="aspect-square w-full" showTag={false} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <motion.div
          className="lg:col-span-4 lg:col-start-9 lg:pt-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease }}
        >
          <nav aria-label="Breadcrumb">
            <ol className="eyebrow flex items-center gap-3 text-faint">
              <li>
                <Link to="/shop" className="link-underline transition-colors hover:text-ivory">
                  Shop
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-muted">
                {product.name}
              </li>
            </ol>
          </nav>
          <h1 className="mt-8 text-display-md font-light uppercase">{product.name}</h1>
          <p className="mt-6 font-display text-display-xs tabular-nums">{formatPrice(product.price)}</p>
          <p className="label mt-2 font-medium text-muted">
            {product.stock === 0 ? "Coming soon" : product.stock <= 5 ? `Only ${product.stock} left` : "In stock"}
          </p>
          {product.description && <p className="mt-8 whitespace-pre-line text-muted">{product.description}</p>}

          {product.stock > 0 && (
            <div className="mt-10 flex items-center gap-4">
              <span className="eyebrow text-faint">Qty</span>
              <QuantityStepper value={quantity} max={Math.min(product.stock, 99)} label={product.name} allowZero={false} onChange={setQuantity} />
            </div>
          )}
          <AddToCartButton product={product} quantity={quantity} size="lg" className="mt-6 w-full" />
        </motion.div>
      </section>
    </PageTransition>
  );
}
