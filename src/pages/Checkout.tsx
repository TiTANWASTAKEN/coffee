import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { Lock } from "lucide-react";
import type { CheckoutConfig, CouponQuote, CreateOrderRequest, CreateOrderResponse, CustomerDetails, PaymentMethod, SavedAddress } from "@shared/store";
import { EMAIL_PATTERN } from "@shared/email";
import { shippingForQuantity } from "@shared/shipping";
import { accountsEnabled } from "@/config/features";
import { site } from "@/config/site";
import { getProduct } from "@/data/products";
import { AddressLines } from "@/components/account/AddressForm";
import { Field, StateField } from "@/components/ui/Field";
import { PageTransition } from "@/components/layout/PageTransition";
import { SmartImage } from "@/components/media/SmartImage";
import { QuantityStepper } from "@/components/cart/QuantityStepper";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { api, errorMessage } from "@/lib/api";
import { track } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { loadRazorpay, openRazorpay } from "@/lib/razorpay";
import { useAccount } from "@/store/account";
import { coverAsset, useCatalog } from "@/store/catalog";
import { useCart } from "@/store/cart";

const DETAILS_KEY = "ht-checkout-details";

const emptyDetails: CustomerDetails = { name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" };

function loadDetails(): CustomerDetails {
  try {
    return { ...emptyDetails, ...JSON.parse(sessionStorage.getItem(DETAILS_KEY) ?? "{}") };
  } catch {
    return emptyDetails;
  }
}

function addressFields({ line1, line2, city, state, postalCode }: SavedAddress) {
  return { line1, line2, city, state, postalCode };
}

type Phase = "idle" | "creating" | "paying" | "verifying";

export default function Checkout() {
  useDocumentTitle("Checkout");
  const cart = useCart();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const [details, setDetails] = useState<CustomerDetails>(loadDetails);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const [checkout, setCheckout] = useState<CheckoutConfig | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("razorpay");
  const { loading: accountLoading, customer } = useAccount();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [applied, setApplied] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  }, [details]);

  useEffect(() => {
    api<CheckoutConfig>("/checkout/config")
      .then((c) => {
        setCheckout(c);
        setMethod((current) => (c.methods.includes(current) ? current : c.methods[0] ?? "razorpay"));
      })
      .catch(() => undefined);
  }, []);

  const cartKey = cart.lines.map((line) => `${line.product.id}:${line.quantity}`).join(",");
  useEffect(() => {
    setApplied(null);
    setCouponError(null);
    if (!cartKey) return;
    sessionStorage.setItem("ht-idem", crypto.randomUUID());
  }, [cartKey]);

  useEffect(() => {
    if (!customer) {
      setAddresses([]);
      return;
    }
    let cancelled = false;
    api<SavedAddress[]>("/account/addresses")
      .then((list) => {
        if (cancelled) return;
        setAddresses(list);
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        setDetails((d) => ({
          ...d,
          ...(preferred && !d.line1 ? addressFields(preferred) : {}),
          name: d.name || preferred?.name || customer.name,
          email: d.email || customer.email,
          phone: d.phone || preferred?.phone || customer.phone,
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [customer]);

  const set = (field: keyof CustomerDetails) => (value: string) => setDetails((d) => ({ ...d, [field]: value }));
  const busy = phase !== "idle";
  const units = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  const quotedShipping = checkout ? shippingForQuantity(units, checkout.shippingPaise) : 0;
  const shippingPaise = applied?.shippingPaise ?? quotedShipping;
  const totalPaise = applied?.total ?? cart.subtotal + shippingPaise;

  async function applyCoupon() {
    setCouponError(null);
    setApplying(true);
    try {
      const quote = await api<CouponQuote>("/checkout/coupon", {
        method: "POST",
        body: { code: couponCode, items: cart.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })) },
      });
      setApplied(quote);
      setCouponCode(quote.code);
    } catch (err) {
      setApplied(null);
      setCouponError(errorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  const matchesDetails = (a: SavedAddress) =>
    (Object.keys(addressFields(a)) as (keyof ReturnType<typeof addressFields>)[]).every(
      (k) => a[k].trim().toLowerCase() === details[k].trim().toLowerCase(),
    );

  function pickAddress(a: SavedAddress) {
    setDetails((d) => ({ ...d, ...addressFields(a), name: a.name || d.name, phone: a.phone || d.phone }));
  }

  function onPaid(orderId: string, amount: number) {
    track("purchase", { value: amount / 100, order: orderId });
    cart.clear();
    sessionStorage.removeItem(DETAILS_KEY);
    void catalog.refresh();
    navigate(`/order/${orderId}`, { replace: true });
  }

  async function simulate(request: CreateOrderRequest, outcome: "success" | "failure") {
    setPhase(outcome === "success" ? "verifying" : "creating");
    try {
      const { orderId } = await api<{ orderId: string }>("/checkout/simulate", { method: "POST", body: { ...request, outcome } });
      if (outcome === "success") return onPaid(orderId, cart.subtotal);
      setPhase("idle");
      setError("Test: payment failed — your bank declined the payment. You haven’t been charged and your cart is saved, so you can try again.");
    } catch (err) {
      setPhase("idle");
      setError(errorMessage(err));
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || cart.lines.length === 0) return;
    setError(null);

    const request: CreateOrderRequest = {
      items: cart.lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      customer: details,
      saveAddress: Boolean(customer) && saveAddress && !addresses.some(matchesDetails),
      paymentMethod: method,
      idempotencyKey: sessionStorage.getItem("ht-idem") ?? crypto.randomUUID(),
      ...(applied ? { couponCode: applied.code } : {}),
    };
    const simulated = ((e.nativeEvent as SubmitEvent).submitter as HTMLElement | null)?.dataset.simulate;
    if (simulated === "success" || simulated === "failure") return simulate(request, simulated);

    setPhase("creating");
    track("begin_checkout", { value: cart.subtotal / 100, items: cart.count });

    try {
      const prepare = method === "razorpay" ? loadRazorpay() : Promise.resolve();
      const [order] = await Promise.all([api<CreateOrderResponse>("/checkout/order", { method: "POST", body: request }), prepare]);

      if (order.paymentMethod !== "razorpay" || !order.razorpayOrderId || !order.keyId) {
        onPaid(order.orderId, order.amount);
        return;
      }

      setPhase("paying");
      openRazorpay(
        {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.razorpayOrderId,
          name: site.name,
          description: `${cart.count} item${cart.count === 1 ? "" : "s"}`,
          prefill: { name: details.name, email: details.email, contact: details.phone },
          theme: { color: "#0d0c0b" },
          modal: {
            confirm_close: true,
            ondismiss: () => {
              setPhase((p) => (p === "paying" ? "idle" : p));
              setError((current) => current ?? "Payment cancelled. Your cart is saved — you can try again.");
            },
          },
          handler: async (response) => {
            setPhase("verifying");
            setError(null);
            try {
              const { orderId } = await api<{ orderId: string }>("/checkout/verify", { method: "POST", body: response });
              onPaid(orderId, order.amount);
            } catch (err) {
              setPhase("idle");
              setError(`${errorMessage(err)} Payment ID: ${response.razorpay_payment_id}`);
            }
          },
        },
        (message) => {
          setPhase("idle");
          setError(message);
        },
      );
    } catch (err) {
      setPhase("idle");
      setError(errorMessage(err));
      void catalog.refresh();
    }
  }

  if (phase === "verifying") {
    return (
      <PageTransition>
        <section className="container-site grid min-h-[100svh] place-items-center pt-nav text-center">
          <div>
            <p className="eyebrow text-muted">Payment received</p>
            <p className="mt-6 font-display text-display-sm font-light">Confirming your order…</p>
          </div>
        </section>
      </PageTransition>
    );
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <PageTransition>
        <section className="container-site grid min-h-[80svh] place-items-center pt-nav text-center">
          <div className="flex flex-col items-center">
            <p className="eyebrow text-muted">Checkout</p>
            <h1 className="mt-6 text-display-md font-light uppercase">Your cart is empty.</h1>
            <ButtonLink to="/shop" className="mt-10">
              Browse the shop
            </ButtonLink>
          </div>
        </section>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="container-site pb-section pt-[calc(var(--spacing-nav)_+_3rem)]">
        <p className="eyebrow flex items-center gap-4 text-muted">
          <span aria-hidden="true" className="h-px w-8 bg-accent" />
          Checkout
        </p>
        <h1 className="mt-6 text-display-md font-light uppercase">Almost yours.</h1>

        <form onSubmit={onSubmit} className="mt-14 grid gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            {accountsEnabled && !accountLoading && !customer && (
              <p className="mb-10 border border-line px-5 py-4 text-body-sm text-muted">
                Have an account?{" "}
                <Link to="/account/login?next=/checkout" className="text-ivory underline">
                  Sign in
                </Link>{" "}
                to use saved addresses and see this order in your account. Or just check out as a guest.
              </p>
            )}

            <Fieldset legend="Contact">
              <Field label="Full name" autoComplete="name" value={details.name} onChange={set("name")} required className="sm:col-span-2" />
              <Field label="Email" type="text" inputMode="email" autoComplete="email" pattern={EMAIL_PATTERN} title="Use an address like name@email.com, name@email.in, or name@email.co.in" value={details.email} onChange={set("email")} required />
              <Field
                label="Phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                pattern="\+?[0-9\s\-]{10,15}"
                value={details.phone}
                onChange={set("phone")}
                required
              />
            </Fieldset>

            <Fieldset legend="Shipping address" className="mt-12">
              {addresses.length > 0 && (
                <div role="radiogroup" aria-label="Saved addresses" className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={matchesDetails(a)}
                      onClick={() => pickAddress(a)}
                      className="border border-line p-4 text-left text-body-sm transition-colors hover:border-line-strong aria-checked:border-ivory aria-checked:bg-surface"
                    >
                      <AddressLines address={a} />
                    </button>
                  ))}
                </div>
              )}
              <Field label="Address" autoComplete="address-line1" value={details.line1} onChange={set("line1")} required className="sm:col-span-2" />
              <Field
                label="Apartment, landmark (optional)"
                autoComplete="address-line2"
                value={details.line2}
                onChange={set("line2")}
                className="sm:col-span-2"
              />
              <Field label="City" autoComplete="address-level2" value={details.city} onChange={set("city")} required />
              <StateField value={details.state} onChange={set("state")} />
              <Field
                label="PIN code"
                autoComplete="postal-code"
                inputMode="numeric"
                pattern="[1-9][0-9]{5}"
                maxLength={6}
                value={details.postalCode}
                onChange={set("postalCode")}
                required
              />
              {accountsEnabled && customer && !addresses.some(matchesDetails) && (
                <label className="flex items-center gap-3 text-body-sm text-muted sm:col-span-2">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="size-4 accent-ivory" />
                  Save this address to my account
                </label>
              )}
            </Fieldset>
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="border border-line bg-surface p-6 lg:sticky lg:top-[calc(var(--spacing-nav)_+_1.5rem)]">
              <h2 className="eyebrow font-sans text-muted">Order summary</h2>
              <ul className="mt-4">
                {cart.lines.map(({ product, quantity }) => (
                  <li key={product.id} className="flex gap-4 border-b border-line py-4">
                    <SmartImage asset={coverAsset(product, getProduct(product.slug)?.image)} className="aspect-[4/5] w-16 shrink-0" showTag={false} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-lg uppercase leading-tight">{product.name}</p>
                        <p className="text-body-sm tabular-nums">{formatPrice(product.price * quantity)}</p>
                      </div>
                      <QuantityStepper value={quantity} max={product.stock} label={product.name} onChange={(q) => cart.setQuantity(product.id, q)} />
                    </div>
                  </li>
                ))}
              </ul>
              <fieldset className="mt-6 border-t border-line pt-5">
                <legend className="eyebrow text-muted">Payment</legend>
                <div className="mt-3 flex flex-col gap-2">
                  {(checkout?.methods ?? []).map((option) => (
                    <label key={option} className="flex min-h-11 items-center gap-3 text-body-sm">
                      <input type="radio" name="payment" value={option} checked={method === option} onChange={() => setMethod(option)} className="size-4 accent-ivory" />
                      {option === "razorpay" ? "Pay online" : option === "cod" ? "Cash on delivery" : "UPI — we verify it before shipping"}
                    </label>
                  ))}
                  {checkout && checkout.methods.length === 0 && <p className="text-body-sm text-muted">Payments are not set up yet.</p>}
                </div>
              </fieldset>

              <div className="mt-5 border-t border-line pt-5">
                <label className="flex flex-col gap-2">
                  <span className="eyebrow text-muted">Coupon</span>
                  <span className="flex gap-3">
                    <input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setApplied(null);
                        setCouponError(null);
                      }}
                      aria-label="Coupon code"
                      autoCapitalize="characters"
                      maxLength={20}
                      disabled={busy}
                      className="min-h-11 min-w-0 flex-1 border-b border-line-strong bg-transparent uppercase tracking-[0.14em] text-ivory focus:border-ivory focus:outline-none"
                    />
                    <Button type="button" variant="outline" size="sm" disabled={busy || applying || !couponCode.trim()} onClick={() => void applyCoupon()}>
                      {applying ? "Checking…" : "Apply"}
                    </Button>
                  </span>
                </label>
                {couponError && (
                  <p role="alert" className="mt-3 text-body-sm text-ivory">
                    {couponError}
                  </p>
                )}
              </div>

              <dl className="mt-5 flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between text-muted">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd>
                </div>
                {(checkout?.shippingPaise ?? 0) > 0 || (checkout && !checkout.shippingConfigured) ? (
                  <div className="flex justify-between text-muted">
                    <dt>Shipping</dt>
                    <dd className="tabular-nums">
                      {formatPrice(shippingPaise)}
                      {checkout && !checkout.shippingConfigured ? " (not configured)" : ""}
                    </dd>
                  </div>
                ) : null}
                {applied && applied.discountPaise > 0 ? (
                  <div className="flex justify-between text-muted">
                    <dt>Discount ({applied.code})</dt>
                    <dd className="tabular-nums">−{formatPrice(applied.discountPaise)}</dd>
                  </div>
                ) : null}
                <div className="mt-2 flex items-baseline justify-between border-t border-line pt-4">
                  <dt className="eyebrow text-muted">Total</dt>
                  <dd className="font-display text-display-xs tabular-nums">{formatPrice(totalPaise)}</dd>
                </div>
              </dl>

              {error && (
                <p role="alert" className="mt-5 border border-coffee-light/60 bg-coffee/20 px-4 py-3 text-body-sm text-ivory">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" className="mt-6 w-full" disabled={busy || !cart.ready || checkout?.methods.length === 0} cursor="Pay">
                {phase === "creating" ? "Placing order…" : phase === "paying" ? "Complete payment in the window" : method === "razorpay" ? `Pay ${formatPrice(totalPaise)}` : "Place order"}
              </Button>
              <p className="mt-4 flex items-center justify-center gap-2 text-body-sm text-faint">
                <Lock aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
                {method === "razorpay" ? "Secured by Razorpay" : method === "upi" ? "We check the payment before shipping" : "Pay when the order arrives"}
              </p>

              {checkout?.testPayments && method === "razorpay" && (
                <div className="mt-6 border border-dashed border-line-strong p-4">
                  <p className="eyebrow text-muted">Test mode</p>
                  <p className="mt-2 text-body-sm text-faint">Skips Razorpay and settles the order straight away. Turn off with TEST_PAYMENTS in .env.</p>
                  <div className="mt-4 grid gap-2">
                    <Button type="submit" data-simulate="success" variant="outline" size="sm" disabled={busy || !cart.ready} className="w-full">
                      Simulate successful payment
                    </Button>
                    <Button type="submit" data-simulate="failure" variant="outline" size="sm" disabled={busy || !cart.ready} className="w-full">
                      Simulate failed payment
                    </Button>
                  </div>
                </div>
              )}
              <p className="mt-4 text-center text-body-sm text-faint">
                By paying you agree to our{" "}
                <Link to="/legal/terms" className="underline hover:text-ivory">
                  terms
                </Link>{" "}
                and{" "}
                <Link to="/legal/returns" className="underline hover:text-ivory">
                  returns policy
                </Link>
                .
              </p>
            </div>
          </aside>
        </form>
      </section>
    </PageTransition>
  );
}

function Fieldset({ legend, children, className = "" }: { legend: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={className}>
      <legend className="font-display text-display-xs font-light">{legend}</legend>
      <div className="mt-6 grid gap-x-6 gap-y-7 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

