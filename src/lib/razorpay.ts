/** Minimal typings for Razorpay Checkout — https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/ */

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error: { description?: string; reason?: string };
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void; confirm_close?: boolean };
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", callback: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | null = null;

/** Loads checkout.js once, on demand. */
export function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Couldn't load the payment window. Check your connection or disable ad blockers and try again."));
    };
    document.body.appendChild(script);
  });
  return loading;
}

export function openRazorpay(options: RazorpayOptions, onFailed: (message: string) => void): void {
  if (!window.Razorpay) throw new Error("Payment window not loaded.");
  const rzp = new window.Razorpay(options);
  rzp.on("payment.failed", (res) => onFailed(res.error.description ?? "Payment failed. Please try again."));
  rzp.open();
}
