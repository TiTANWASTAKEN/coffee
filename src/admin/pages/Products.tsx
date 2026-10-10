import { Link, useNavigate } from "react-router";
import { ImageOff, Plus } from "lucide-react";
import type { StoreProduct } from "@shared/store";
import { formatPrice } from "@/lib/format";
import { useAdminQuery } from "../auth";
import { adminButton, Alert, Badge, Card, Loading, PageTitle } from "../ui";

export default function Products() {
  const navigate = useNavigate();
  const { data: products, error, loading } = useAdminQuery<StoreProduct[]>("/products");
  const totalStock = products?.reduce((n, p) => n + p.stock, 0) ?? 0;

  return (
    <>
      <PageTitle
        title="Products"
        subtitle={products ? `${products.length} products · ${totalStock} units in stock` : undefined}
        actions={
          <Link to="/admin/products/new" className={adminButton("primary")}>
            <Plus aria-hidden="true" className="size-4" /> New product
          </Link>
        }
      />
      {error && <Alert>{error}</Alert>}
      <Card>
        {loading && !products ? (
          <Loading />
        ) : !products?.length ? (
          <p className="py-6 text-body-sm text-muted">No products yet. Add your first one.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-body-sm">
              <thead className="text-[0.75rem] uppercase tracking-wider text-faint">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Product</th>
                  <th className="px-3 py-2.5 text-right font-medium">Price</th>
                  <th className="px-3 py-2.5 text-right font-medium">Qty in stock</th>
                  <th className="px-3 py-2.5 font-medium">Images</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/admin/products/${p.id}`)} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-raised">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {p.images[0] ? (
                          <img src={p.images[0]} alt="" className="size-11 rounded-sm object-cover" />
                        ) : (
                          <span className="grid size-11 place-items-center rounded-sm bg-surface-raised text-faint">
                            <ImageOff aria-hidden="true" className="size-4" />
                          </span>
                        )}
                        <div>
                          <Link to={`/admin/products/${p.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
                            {p.name}
                          </Link>
                          <p className="text-[0.8rem] text-faint">/{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{formatPrice(p.price)}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${p.stock === 0 ? "text-danger" : p.stock <= 5 ? "text-warning" : ""}`}>{p.stock}</td>
                    <td className="px-3 py-3 text-muted">{p.images.length}</td>
                    <td className="px-5 py-3">
                      <Badge value={p.active ? "active" : "hidden"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
