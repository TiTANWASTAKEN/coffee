export const legalCopy: Record<string, { intro: string; paragraphs: string[] }> = {
  privacy: {
    intro: "What we keep, and why.",
    paragraphs: [
      "When you place an order we keep your name, email, phone number, and delivery address. We use them to take payment, pack the bag, send the confirmation, and show you tracking.",
      "Payment card details stay with Razorpay. We store the payment reference, not your card.",
      "We do not sell your details. Write to us if you want the information we hold for an order corrected or removed, once that order has been delivered.",
    ],
  },
  terms: {
    intro: "Ordering from the roastery.",
    paragraphs: [
      "An order is confirmed when payment succeeds. The price on the product page is for the coffee. Shipping is added at checkout and shown before you pay.",
      "If a coffee is marked coming soon, it cannot be bought. If the bag sells out while you are paying, the order will not go through.",
      "The tasting notes describe the coffee. Your cup still depends on the grind, the water, and how you brew it.",
    ],
  },
  shipping: {
    intro: "Charged by weight, shown before you pay.",
    paragraphs: [
      "Shipping for up to 1 kg is the rate shown at checkout. Each kilogram after that, including part of a kilogram, adds ₹40. A bag is 250g, so 1.5 kg and 2 kg cost the same.",
      "We ship across India. Checkout needs a 6-digit PIN code.",
      "After the order is packed, track it with the order number and the phone number used at checkout.",
    ],
  },
  returns: {
    intro: "If something arrives wrong.",
    paragraphs: [
      "Coffee is food, so we cannot take back a bag that has been opened. If the bag arrives damaged, leaking, or is not what you ordered, write to us with the order number and a photo.",
      "Email us within 7 days of delivery. We will replace the bag or refund the order.",
    ],
  },
};
