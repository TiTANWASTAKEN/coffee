/**
 * Types shared by the API server (`server/`) and the React app (`src/`).
 * All money values are integers in paise (₹1 = 100).
 */

export interface StoreProduct {
  id: number;
  slug: string;
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

export interface CreateOrderRequest {
  items: CheckoutItem[];
  customer: CustomerDetails;
  /** Signed-in customers only: remember this shipping address. */
  saveAddress?: boolean;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  keyId: string;
  amount: number;
  currency: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type PaymentStatus = "pending" | "paid" | "failed";
export type Fulfillment = "unfulfilled" | "shipped" | "delivered" | "cancelled";

export const FULFILLMENT_STATES: Fulfillment[] = ["unfulfilled", "shipped", "delivered", "cancelled"];

export interface OrderItem {
  productId: number | null;
  name: string;
  unitPrice: number;
  quantity: number;
}

/** What a customer sees on the confirmation page and in their account. */
export interface OrderSummary {
  /** Random public id used in URLs. */
  id: string;
  /** Sequential order number customers can quote. */
  number: number;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  amount: number;
  currency: string;
  customerName: string;
  email: string;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
}

export interface AdminOrder {
  id: number;
  publicId: string;
  status: PaymentStatus;
  fulfillment: Fulfillment;
  amount: number;
  currency: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  /** Null for guest checkouts. */
  customerId: number | null;
  customer: CustomerDetails;
  items: OrderItem[];
  createdAt: string;
  paidAt: string | null;
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
  revenue: number;
  paidOrders: number;
  pendingOrders: number;
  unfulfilledOrders: number;
  products: number;
  lowStock: Pick<StoreProduct, "id" | "name" | "stock">[];
  recentOrders: AdminOrder[];
}
