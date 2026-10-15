import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type DragEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Trash2, Upload } from "lucide-react";
import type { ProductInput, StoreProduct } from "@shared/store";
import { errorMessage } from "@/lib/api";
import { useAdminAuth, useAdminQuery } from "../auth";
import { AdminButton, Alert, Card, FormField, inputClass, Loading, PageTitle } from "../ui";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

export default function ProductEdit() {
  const { id } = useParams();
  return id ? <EditExisting id={id} /> : <ProductForm />;
}

function EditExisting({ id }: { id: string }) {
  const { data, setData, error, loading } = useAdminQuery<StoreProduct>(`/products/${id}`);
  if (loading && !data) return <Loading />;
  if (error || !data) return <Alert>{error ?? "Product not found."}</Alert>;
  return <ProductForm key={data.id} product={data} onChange={setData} />;
}

function ProductForm({ product, onChange }: { product?: StoreProduct; onChange?: (p: StoreProduct) => void }) {
  const { request } = useAdminAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? String(product.price / 100) : "");
  const [stock, setStock] = useState(product ? String(product.stock) : "0");
  const [active, setActive] = useState(product?.active ?? true);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const paise = Math.round(Number(price) * 100);
    if (!Number.isFinite(paise) || paise < 100) return setMessage({ tone: "error", text: "Price must be at least ₹1." });

    const body: ProductInput = { name, slug: slug || undefined, sku: sku || undefined, description, price: paise, stock: Number(stock), active };
    setSaving(true);
    setMessage(null);
    try {
      if (product) {
        const updated = await request<StoreProduct>(`/products/${product.id}`, { method: "PATCH", body });
        onChange?.(updated);
        setSlug(updated.slug);
        setMessage({ tone: "success", text: "Saved." });
      } else {
        const created = await request<StoreProduct>("/products", { method: "POST", body });
        if (pendingFiles.length) await uploadImages(request, created.id, pendingFiles);
        navigate(`/admin/products/${created.id}`, { replace: true });
      }
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!product || !window.confirm(`Delete “${product.name}”? Past orders keep their line items, but the product and its images will be removed.`)) return;
    try {
      await request(`/products/${product.id}`, { method: "DELETE" });
      navigate("/admin/products", { replace: true });
    } catch (err) {
      setMessage({ tone: "error", text: errorMessage(err) });
    }
  }

  return (
    <>
      <Link to="/admin/products" className="mb-4 inline-flex items-center gap-2 text-body-sm text-muted hover:text-ivory">
        <ArrowLeft aria-hidden="true" className="size-4" /> Products
      </Link>
      <PageTitle
        title={product ? product.name : "New product"}
        subtitle={
          product && (
            <a href={`/shop/${product.slug}`} target="_blank" rel="noreferrer" className="hover:underline">
              View in store ↗
            </a>
          )
        }
        actions={
          product && (
            <AdminButton tone="danger" onClick={() => void onDelete()}>
              <Trash2 aria-hidden="true" className="size-4" /> Delete
            </AdminButton>
          )
        }
      />

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Name" className="sm:col-span-2">
                <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="SKU" hint="Your own stock code. Leave blank to use the URL slug.">
                <input maxLength={80} value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <textarea rows={5} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} py-2.5`} />
              </FormField>
              <FormField label="Price (₹)">
                <input required type="number" min="1" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
              </FormField>
              <FormField label="Quantity in stock">
                <input required type="number" min="0" step="1" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={inputClass} />
              </FormField>
              <FormField
                label="URL slug"
                hint={
                  <>
                    Leave blank to generate from the name. Use <code>honest-truth</code>, <code>dark-truth</code> or <code>bitter-truth</code> to link to
                    a coffee page.
                  </>
                }
                className="sm:col-span-2"
              >
                <input value={slug} maxLength={80} placeholder="auto" onChange={(e) => setSlug(e.target.value)} className={inputClass} />
              </FormField>
            </div>
          </Card>

          {product ? (
            <ImageManager product={product} onChange={(p) => onChange?.(p)} />
          ) : (
            <PendingImages files={pendingFiles} onChange={setPendingFiles} />
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Visibility">
            <label className="flex cursor-pointer items-start gap-3 text-body-sm">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-1 size-4 accent-ivory" />
              <span>
                <span className="block font-medium">Show in store</span>
                <span className="text-muted">Hidden products can’t be added to carts.</span>
              </span>
            </label>
          </Card>
          <div className="flex flex-col gap-3 lg:sticky lg:top-6">
            <AdminButton type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : product ? "Save changes" : "Create product"}
            </AdminButton>
            {message && <Alert tone={message.tone}>{message.text}</Alert>}
          </div>
        </div>
      </form>
    </>
  );
}

// ---------- Images ----------

type Request = ReturnType<typeof useAdminAuth>["request"];

function uploadImages(request: Request, productId: number, files: File[]) {
  const body = new FormData();
  for (const file of files) body.append("images", file);
  return request<StoreProduct>(`/products/${productId}/images`, { method: "POST", body });
}

function validFiles(list: FileList | null): { files: File[]; error: string | null } {
  const files = [...(list ?? [])];
  const tooBig = files.filter((f) => f.size > MAX_BYTES);
  const wrongType = files.filter((f) => !ACCEPT.split(",").includes(f.type));
  const ok = files.filter((f) => !tooBig.includes(f) && !wrongType.includes(f));
  const problems = [
    tooBig.length && `${tooBig.map((f) => f.name).join(", ")} ${tooBig.length === 1 ? "is" : "are"} over 5 MB`,
    wrongType.length && `${wrongType.map((f) => f.name).join(", ")} ${wrongType.length === 1 ? "isn't" : "aren't"} a supported image`,
  ].filter(Boolean);
  return { files: ok, error: problems.length ? `${problems.join("; ")}.` : null };
}

function DropZone({ onFiles, busy }: { onFiles: (files: FileList | null) => void; busy?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFiles(e.dataTransfer.files);
  };
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center gap-3 rounded-sm border border-dashed px-6 py-8 text-center transition-colors ${over ? "border-ivory bg-surface-raised" : "border-line-strong"}`}
    >
      <Upload aria-hidden="true" strokeWidth={1.5} className="size-6 text-muted" />
      <p className="text-body-sm text-muted">Drag images here, or</p>
      <AdminButton tone="secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Uploading…" : "Choose files"}
      </AdminButton>
      <p className="text-[0.8rem] text-faint">JPG, PNG, WebP, AVIF or GIF · up to 5 MB each · first image is the cover</p>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ImageManager({ product, onChange }: { product: StoreProduct; onChange: (p: StoreProduct) => void }) {
  const { request } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(list: FileList | null) {
    const { files, error: invalid } = validFiles(list);
    setError(invalid);
    if (!files.length) return;
    setBusy(true);
    try {
      onChange(await uploadImages(request, product.id, files));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function setImages(images: string[]) {
    setBusy(true);
    setError(null);
    try {
      onChange(await request<StoreProduct>(`/products/${product.id}`, { method: "PATCH", body: { images } }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const move = (from: number, to: number) => {
    const next = [...product.images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void setImages(next);
  };

  return (
    <Card title={`Images (${product.images.length})`}>
      {product.images.length > 0 && (
        <ul className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {product.images.map((src, i) => (
            <li key={src} className="overflow-hidden rounded-sm border border-line">
              <div className="relative">
                <img src={src} alt="" className="aspect-square w-full object-cover" />
                {i === 0 && <span className="absolute left-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[0.7rem] font-medium">Cover</span>}
              </div>
              <div className="flex items-center justify-between gap-1 p-1.5">
                <div className="flex">
                  <IconButton label="Move left" disabled={busy || i === 0} onClick={() => move(i, i - 1)}>
                    <ChevronLeft className="size-4" />
                  </IconButton>
                  <IconButton label="Move right" disabled={busy || i === product.images.length - 1} onClick={() => move(i, i + 1)}>
                    <ChevronRight className="size-4" />
                  </IconButton>
                  <IconButton label="Make cover" disabled={busy || i === 0} onClick={() => move(i, 0)}>
                    <Star className="size-4" />
                  </IconButton>
                </div>
                <IconButton
                  label="Remove image"
                  disabled={busy}
                  onClick={() => window.confirm("Remove this image?") && void setImages(product.images.filter((u) => u !== src))}
                >
                  <Trash2 className="size-4 text-danger" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DropZone onFiles={(f) => void upload(f)} busy={busy} />
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
    </Card>
  );
}

function PendingImages({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  return (
    <Card title="Images">
      {files.length > 0 && (
        <ul className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {previews.map((src, i) => (
            <li key={src} className="overflow-hidden rounded-sm border border-line">
              <img src={src} alt="" className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between p-1.5 text-[0.75rem] text-muted">
                <span className="truncate px-1">{i === 0 ? "Cover" : files[i]?.name}</span>
                <IconButton label="Remove image" onClick={() => onChange(files.filter((_, j) => j !== i))}>
                  <Trash2 className="size-4 text-danger" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DropZone
        onFiles={(list) => {
          const { files: ok, error: invalid } = validFiles(list);
          setError(invalid);
          onChange([...files, ...ok]);
        }}
      />
      <p className="mt-3 text-[0.8rem] text-faint">Images upload when you create the product.</p>
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
    </Card>
  );
}

function IconButton({ label, children, ...props }: { label: string; children: ReactNode } & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-sm text-muted transition-colors hover:bg-surface-raised hover:text-ivory disabled:opacity-30 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}
