import { useParams } from "react-router";
import { legalNav, site } from "@/config/site";
import { PageTransition } from "@/components/layout/PageTransition";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import NotFound from "./NotFound";

const copy: Record<string, { intro: string; paragraphs: string[] }> = {
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
    intro: "A flat charge, shown before you pay.",
    paragraphs: [
      "Shipping is a flat fee added to every order. The amount is on the checkout page, in the total, before you pay.",
      "If we cannot deliver to the PIN code you enter, checkout tells you before any payment is taken.",
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

export default function Legal() {
  const { slug } = useParams();
  const page = legalNav.find((item) => item.to === `/legal/${slug}`);
  const body = slug ? copy[slug] : undefined;
  useDocumentTitle(page?.label);

  if (!page || !body) return <NotFound />;

  return (
    <PageTransition>
      <PageHeader eyebrow="Legal" title={[page.label]} intro={body.intro} />
      <section className="container-site pb-section">
        <div className="max-w-prose border-t border-line pt-10 text-muted">
          {body.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mt-6 first:mt-0">
              {paragraph}
            </p>
          ))}
          <p className="mt-6">
            Questions?{" "}
            <a href={`mailto:${site.contactEmail}`} className="link-underline text-ivory">
              {site.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </PageTransition>
  );
}
