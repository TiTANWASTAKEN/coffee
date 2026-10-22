import type { Coupon, CouponKind, CouponQuote } from "../shared/store";
import { couponDiscount, couponOfferError, generateCouponCode, isCouponCode, normalizeCouponCode, payableDiscount, quote } from "./commerce";
import { db } from "./db";
import { badRequest, int, notFound } from "./http";

interface CouponRow {
  id: number;
  code: string;
  kind: string;
  value: number;
  max_uses: number;
  used: number;
  active: number;
  created_at: string;
}

function toCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind === "percent" ? "percent" : "flat",
    value: row.value,
    maxUses: row.max_uses,
    used: row.used,
    active: row.active === 1,
    createdAt: row.created_at,
  };
}

export function listCoupons(): Coupon[] {
  return (db.prepare("SELECT * FROM coupons ORDER BY id DESC").all() as unknown as CouponRow[]).map(toCoupon);
}

export function getCouponByCode(code: string): Coupon | undefined {
  const row = db.prepare("SELECT * FROM coupons WHERE code = ?").get(code) as unknown as CouponRow | undefined;
  return row && toCoupon(row);
}

export function readCouponCode(raw: unknown): string {
  const code = normalizeCouponCode(typeof raw === "string" ? raw : "");
  if (!code) throw badRequest("Enter a code.");
  if (!isCouponCode(code)) throw badRequest("Use 3-20 letters, numbers, or hyphens.");
  return code;
}

/** Prices a code without taking a use. The use is taken when the order is saved. */
export function quoteCoupon(codeRaw: unknown, subtotal: number, shippingPaise: number): CouponQuote {
  const code = readCouponCode(codeRaw);
  const coupon = getCouponByCode(code);
  if (!coupon) throw badRequest("That code isn't valid.");
  if (!coupon.active) throw badRequest("That code is no longer active.");
  if (coupon.used >= coupon.maxUses) throw badRequest("This code has been used up.");
  const offered = couponDiscount(subtotal, coupon.kind, coupon.value);
  const discountPaise = payableDiscount(subtotal, shippingPaise, offered);
  if (discountPaise < 1) throw badRequest("This code does not change the total.");
  const priced = quote([{ unitPrice: subtotal, quantity: 1 }], shippingPaise, discountPaise);
  return { code, kind: coupon.kind, discountPaise, subtotal, shippingPaise, total: priced.total };
}

export function createCoupon(body: { code?: unknown; kind?: unknown; value?: unknown; maxUses?: unknown }): Coupon {
  const kind = body.kind === "percent" || body.kind === "flat" ? body.kind : "";
  const value = int(body.value, kind === "percent" ? "Percent" : "Discount", { min: 1, max: 10_000_000 });
  const problem = couponOfferError(kind, value);
  if (problem) throw badRequest(problem);
  const maxUses = int(body.maxUses, "Number of uses", { min: 1, max: 100_000 });
  const requested = typeof body.code === "string" ? body.code : "";
  const code = requested.trim() ? readCouponCode(requested) : unusedCode();
  try {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO coupons (code, kind, value, max_uses) VALUES (?, ?, ?, ?)")
      .run(code, kind as CouponKind, value, maxUses);
    const row = db.prepare("SELECT * FROM coupons WHERE id = ?").get(Number(lastInsertRowid)) as unknown as CouponRow;
    return toCoupon(row);
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) throw badRequest("That code already exists.");
    throw err;
  }
}

function unusedCode(): string {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateCouponCode();
    if (!getCouponByCode(code)) return code;
  }
  throw badRequest("Could not generate a code. Try again.");
}

export function setCouponActive(id: number, active: boolean): Coupon {
  const result = db.prepare("UPDATE coupons SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  if (result.changes !== 1) throw notFound("Coupon not found.");
  const row = db.prepare("SELECT * FROM coupons WHERE id = ?").get(id) as unknown as CouponRow;
  return toCoupon(row);
}
