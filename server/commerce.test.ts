import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { describe, it } from "node:test";
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

describe("quote", () => {
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
