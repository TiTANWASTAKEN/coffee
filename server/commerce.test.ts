import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
import { shippingForQuantity } from "../shared/shipping.ts";
import { isEmail } from "../shared/email.ts";
import {
  RESERVE_STOCK_SQL,
  canChangeFulfillment,
  canRefund,
  contactMatches,
  formatOrderCode,
  letterFor,
  orderEmail,
  parseOrderCode,
  quote,
  upiIntent,
} from "./commerce.ts";

describe("email", () => {
  it("accepts .com, .in, and .co.in", () => {
    assert.equal(isEmail("a@gmail.com"), true);
    assert.equal(isEmail("a@gmail.in"), true);
    assert.equal(isEmail("hello@company.co.in"), true);
    assert.equal(isEmail("name@iitb.ac.in"), true);
    assert.equal(isEmail("not-an-email"), false);
    assert.equal(isEmail("a@b"), false);
  });
});

describe("quote", () => {
  it("charges ₹90 up to 1kg and ₹40 more for each kilogram after that", () => {
    assert.equal(shippingForQuantity(1, 9000), 9000);
    assert.equal(shippingForQuantity(4, 9000), 9000);
    assert.equal(shippingForQuantity(5, 9000), 13000);
    assert.equal(shippingForQuantity(6, 9000), 13000);
    assert.equal(shippingForQuantity(8, 9000), 13000);
    assert.equal(shippingForQuantity(9, 9000), 17000);
    assert.equal(shippingForQuantity(4, 0), 0);
  });

  it("adds a configured shipping charge to database prices", () => {
    const priced = quote(
      [
        { unitPrice: 49900, quantity: 2 },
        { unitPrice: 44900, quantity: 1 },
      ],
      5000,
    );
    assert.equal(priced.subtotal, 144700);
    assert.equal(priced.shippingPaise, 5000);
    assert.equal(priced.total, 149700);
    assert.equal(priced.discountPaise, 0);
  });

  it("takes the discount off the coffee and keeps at least ₹1 payable", () => {
    const percent = quote([{ unitPrice: 44900, quantity: 1 }], 9000, 4490);
    assert.equal(percent.discountPaise, 4490);
    assert.equal(percent.shippingPaise, 9000);
    assert.equal(percent.total, 49410);

    const capped = quote([{ unitPrice: 200, quantity: 1 }], 0, 200);
    assert.equal(capped.discountPaise, 100);
    assert.equal(capped.total, 100);
  });

  it("rejects an empty cart and a negative shipping charge", () => {
    assert.throws(() => quote([], 0));
    assert.throws(() => quote([{ unitPrice: 100, quantity: 1 }], -1));
  });
});

describe("stock reservation", () => {
  it("refuses to sell more than is in stock, including two overlapping checkouts", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE products (id INTEGER PRIMARY KEY, active INTEGER, stock INTEGER, updated_at TEXT)");
    db.prepare("INSERT INTO products (id, active, stock, updated_at) VALUES (1, 1, 2, '')").run();
    const reserve = db.prepare(RESERVE_STOCK_SQL);

    assert.equal(reserve.run(2, 1, 2).changes, 1);
    assert.equal(reserve.run(1, 1, 1).changes, 0);
    assert.equal((db.prepare("SELECT stock FROM products WHERE id = 1").get() as { stock: number }).stock, 0);

    db.prepare("UPDATE products SET stock = 1, active = 0 WHERE id = 1").run();
    assert.equal(reserve.run(1, 1, 1).changes, 0);
  });
});

describe("order codes and tracking checks", () => {
  it("formats and parses order codes", () => {
    assert.equal(formatOrderCode(12), "BT-0012");
    assert.equal(parseOrderCode("bt-0012"), 12);
    assert.equal(parseOrderCode("12"), 12);
    assert.equal(parseOrderCode("BT-"), null);
    assert.equal(parseOrderCode("nope"), null);
  });

  it("matches the email or phone on the order and nothing else", () => {
    const order = { email: "a@example.com", phone: "+91 98100 12345" };
    assert.equal(contactMatches(order, "A@Example.com"), true);
    assert.equal(contactMatches(order, "9810012345"), true);
    assert.equal(contactMatches(order, "b@example.com"), false);
    assert.equal(contactMatches(order, "9810012346"), false);
    assert.equal(contactMatches(order, ""), false);
  });
});

describe("fulfilment and refunds", () => {
  it("blocks shipping until a non-COD payment is verified", () => {
    assert.equal(canChangeFulfillment("unfulfilled", "shipped", { status: "pending", method: "upi" }), "Verify the payment before packing or shipping this order.");
    assert.equal(canChangeFulfillment("unfulfilled", "shipped", { status: "pending", method: "cod" }), null);
    assert.equal(canChangeFulfillment("unfulfilled", "shipped", { status: "paid", method: "razorpay" }), null);
    assert.ok(canChangeFulfillment("delivered", "cancelled", { status: "paid", method: "razorpay" }));
    assert.equal(canChangeFulfillment("shipped", "shipped", { status: "paid", method: "cod" }), null);
  });

  it("only refunds a verified payment that has not been dispatched", () => {
    assert.equal(canRefund("paid", "unfulfilled"), null);
    assert.ok(canRefund("pending", "unfulfilled"));
    assert.ok(canRefund("paid", "shipped"));
  });
});

describe("payment letters", () => {
  it("does not describe a pending UPI order as paid", () => {
    assert.equal(letterFor("upi", "pending"), "upi_pending");
    assert.equal(letterFor("cod", "pending"), "cod");
    assert.equal(letterFor("razorpay", "paid"), "paid");
    assert.equal(letterFor("razorpay", "pending"), null);
    assert.equal(letterFor("razorpay", "failed"), null);

    const letter = orderEmail({
      code: "BT-0008",
      createdAt: "2026-10-11",
      customerName: "Asha",
      items: [{ name: "Honest Truth", quantity: 1, unitPrice: 49900 }],
      subtotal: 49900,
      shippingPaise: 0,
      total: 49900,
      method: "upi",
      letter: "upi_pending",
      addressLines: ["1 Road", "Bengaluru 560001"],
      trackUrl: "http://localhost:5173/track-order",
      supportEmail: "hello@example.com",
    });
    assert.match(letter.subject, /not yet verified/);
    assert.match(letter.text, /will not ship/);
    assert.match(letter.text, /Honest Truth × 1/);
    assert.doesNotMatch(letter.text, /payment received/i);
  });

  it("builds a UPI intent for the exact amount", () => {
    const link = upiIntent({ vpa: "store@upi", payee: "Bitter Truth Coffee", amountPaise: 49900, orderCode: "BT-0008" });
    assert.ok(link.startsWith("upi://pay?"));
    assert.match(link, /am=499\.00/);
    assert.match(link, /pa=store%40upi/);
    assert.match(link, /tn=BT-0008/);
  });
});
