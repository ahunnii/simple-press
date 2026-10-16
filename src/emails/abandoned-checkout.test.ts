import { render } from "@react-email/components";
import { describe, expect, it } from "vitest";

import AbandonedCheckoutEmail from "./abandoned-checkout";

const UNSUBSCRIBE_URL = "https://acme.test/api/unsubscribe?t=tok_123";

function email(postalAddress: string | null) {
  return AbandonedCheckoutEmail({
    customerName: "Jane",
    businessName: "Acme Candles",
    businessUrl: "https://acme.test",
    items: [{ name: "Cotton Tee", quantity: 1, unitAmount: 1500 }],
    unsubscribeUrl: UNSUBSCRIBE_URL,
    postalAddress,
  });
}

describe("AbandonedCheckoutEmail marketing footer", () => {
  it("carries the reason, the unsubscribe link and the postal address", async () => {
    const html = await render(email("123 Main St, Detroit, MI 48201"));
    expect(html).toContain(
      "You received this email because you started a checkout at Acme Candles.",
    );
    expect(html).toContain(`href="${UNSUBSCRIBE_URL}"`);
    expect(html).toContain("Unsubscribe");
    expect(html).toContain("123 Main St, Detroit, MI 48201");
  });

  it("includes the footer in the plain-text rendering", async () => {
    const text = await render(email("123 Main St, Detroit, MI 48201"), {
      plainText: true,
    });
    expect(text).toContain("you started a checkout at Acme Candles");
    expect(text).toContain(UNSUBSCRIBE_URL);
    expect(text).toContain("123 Main St, Detroit, MI 48201");
  });

  it("omits the address line when none is given", async () => {
    const html = await render(email(null));
    expect(html).toContain(`href="${UNSUBSCRIBE_URL}"`);
    expect(html).not.toContain("Acme Candles<!-- -->, ");
  });
});
