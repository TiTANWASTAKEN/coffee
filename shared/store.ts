/**
 * Types shared by the API server (`server/`) and the React app (`src/`).
 * All money values are integers in paise (₹1 = 100).
 */

export interface StoreProduct {
  id: number;
  slug: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  /** Public URLs under /uploads. The first one is the cover image. */
  images: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  slug?: string;
  sku?: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
}

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export type PaymentMethod = "razorpay" | "cod" | "upi";

export interface CreateOrderRequest {
  items: CheckoutItem[];
  customer: CustomerDetails;
  /** Signed-in customers only: remember this shipping address. */
  saveAddress?: boolean;
  paymentMethod?: PaymentMethod;
  notes?: string;
  /** Same key on a retry returns the original order instead of creating another. */
  idempotencyKey?: string;
}

export interface CheckoutConfig {
  testPayments: boolean;
  shippingPaise: number;
  /** False when SHIPPING_PAISE was left unset. The charge is then ₹0 and the checkout says so. */
  shippingConfigured: boolean;
  methods: PaymentMethod[];
  upi: { vpa: string; payee: string } | null;
  supportEmail: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderCode: string;
  amount: number;
  subtotal: number;
  shippingPaise: number;
  currency: string;
  paymentMethod: PaymentMethod;
  razorpayOrderId?: string;
  keyId?: string;
  upi?: { vpa: string; payee: string; intent: string };
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type Fulfillment = "unfulfilled" | "packed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";

export const FULFILLMENT_STATES: Fulfillment[] = ["unfulfilled", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];

const NEXT_FULFILLMENT: Record<Fulfillment, Fulfillment[]> = {
  unfulfilled: ["packed", "shipped", "out_for_delivery", "cancelled"],
  packed: ["shipped", "out_for_delivery", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Legal next statuses. The current status is not included. */
export function nextFulfillments(from: Fulfillment): Fulfillment[] {
  return NEXT_FULFILLMENT[from];
}

export const fulfillmentLabel: Record<Fulfillment, string> = {
  unfulfilled: "Order placed",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface ShipmentInfo {
  courier: string;
  trackingRef: string;
  trackingUrl: string;
  /** Where the parcel is right now, in plain language. */
  location: string;
  dispatchedAt: string | null;
  deliveredAt: string | null;
}

/** A note the admin adds as the order moves. Shown on the public tracking page. */
export interface TrackingUpdate {
  label: string;
  note: string;
  at: string;
}

export interface OrderItem {
  productId: number | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

/** What a customer sees on the confirmation page and in their account. */
export interface OrderSummary {
  /** Random public id used in the private confirmation URL. */
  id: string;
  /** Sequential order number customers can quote. */
  number: number;
  code: string;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingPaise: number;
  amount: number;
  currency: string;
  customerName: string;
  email: string;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
  shipment: Pick<ShipmentInfo, "courier" | "trackingUrl" | "location"> | null;
  updates: TrackingUpdate[];
}

export interface AdminOrder {
  id: number;
  publicId: string;
  code: string;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingPaise: number;
  amount: number;
  currency: string;
  notes: string;
  upiReference: string;
  stockHeld: boolean;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  /** Null for guest checkouts. */
  customerId: number | null;
  customer: CustomerDetails;
  items: OrderItem[];
  shipment: ShipmentInfo | null;
  updates: TrackingUpdate[];
  createdAt: string;
  paidAt: string | null;
}

/** Safe fields returned for an order number. No customer login, and no email or phone. */
export interface TrackedOrder {
  code: string;
  createdAt: string;
  items: Pick<OrderItem, "name" | "quantity" | "unitPrice">[];
  subtotal: number;
  shippingPaise: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  shipment: Pick<ShipmentInfo, "courier" | "trackingUrl" | "location"> | null;
  updates: TrackingUpdate[];
}

// ---------- Customer accounts ----------

export interface CustomerAccount {
  id: number;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface SavedAddress {
  id: number;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export type AddressInput = Omit<SavedAddress, "id" | "isDefault"> & { isDefault?: boolean };

export interface AdminStats {
  /** Verified payments only. Pending, failed and COD-not-yet-collected are excluded. */
  revenue: number;
  refunded: number;
  pendingValue: number;
  codOutstanding: number;
  paidOrders: number;
  pendingOrders: number;
  awaitingVerification: number;
  unfulfilledOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  products: number;
  lowStock: Pick<StoreProduct, "id" | "name" | "stock">[];
  recentOrders: AdminOrder[];
}
