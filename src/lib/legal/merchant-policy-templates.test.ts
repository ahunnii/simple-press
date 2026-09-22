import { describe, expect, it } from "vitest";

import type { PolicyBusiness } from "~/lib/legal/merchant-policy-templates";
import {
  buildPolicyVars,
  markdownToTiptap,
  POLICY_TEMPLATES,
} from "~/lib/legal/merchant-policy-templates";

function biz(overrides: Partial<PolicyBusiness> = {}): PolicyBusiness {
  return {
    name: "Acme Goods",
    supportEmail: "hello@acme.test",
    ownerEmail: "owner@acme.test",
    salesCountries: [],
    businessAddress: "123 Main St, Detroit, MI",
    addressState: "MI",
    phoneNumber: "555-0100",
    shippingType: "free",
    shippingFlatRate: null,
    freeShippingThreshold: null,
    offersInStorePickup: false,
    pickupLocation: null,
    pickupInstructions: null,
    originState: null,
    businessHours: null,
    umamiEnabled: false,
    featureFlags: {},
    venmoHandle: null,
    cashAppHandle: null,
    ...overrides,
  };
}

function shipping(overrides: Partial<PolicyBusiness> = {}) {
  return POLICY_TEMPLATES.shipping.getContent(buildPolicyVars(biz(overrides)));
}

function privacy(overrides: Partial<PolicyBusiness> = {}) {
  return POLICY_TEMPLATES.privacy.getContent(buildPolicyVars(biz(overrides)));
}

function terms(overrides: Partial<PolicyBusiness> = {}) {
  return POLICY_TEMPLATES.terms.getContent(buildPolicyVars(biz(overrides)));
}

function refund(overrides: Partial<PolicyBusiness> = {}) {
  return POLICY_TEMPLATES.refund.getContent(buildPolicyVars(biz(overrides)));
}

describe("buildPolicyVars", () => {
  it("fills contact and ships-to from store settings", () => {
    const vars = buildPolicyVars(biz({ salesCountries: ["CA"] }));
    expect(vars.businessName).toBe("Acme Goods");
    expect(vars.email).toBe("hello@acme.test");
    expect(vars.shipsTo).toBe("the United States and Canada");
    expect(vars.shipsInternational).toBe(true);
    expect(vars.governingRegion).toBe("the State of Michigan");
    expect(vars.governingJurisdiction).toBe("Michigan");
  });

  it("falls back to owner email, then a fill-in, and keeps governing-law placeholders without addressState", () => {
    const vars = buildPolicyVars(
      biz({
        supportEmail: "",
        ownerEmail: "",
        addressState: null,
      }),
    );
    expect(vars.email).toBe("[your email]");
    expect(vars.governingRegion).toBe("[your state/country]");
    expect(vars.governingJurisdiction).toBe("[your jurisdiction]");
  });
});

describe("shipping template", () => {
  it("uses the free-shipping sentence and does not invent delivery speeds", () => {
    const md = shipping({ shippingType: "free" });
    expect(md).toContain("Shipping is free on every order.");
    expect(md).not.toContain("Overnight");
    expect(md).not.toContain("Expedited");
    expect(md).not.toContain("delivery speed");
    expect(md).toContain("[X] business days");
    expect(md).not.toContain("Last updated:");
  });

  it("adds weight/destination bullets only for zone_weight", () => {
    const zone = shipping({ shippingType: "zone_weight" });
    expect(zone).toContain("package weight");
    expect(zone).toContain("Destination");
    expect(zone).not.toContain("Overnight");

    const flat = shipping({
      shippingType: "flat_rate",
      shippingFlatRate: 599,
    });
    expect(flat).toContain("$5.99");
    expect(flat).not.toContain("Package weight");
  });

  it("includes the customs block only when Canada or Mexico is enabled", () => {
    const domestic = shipping({ salesCountries: [] });
    expect(domestic).not.toContain("International Orders");

    const canada = shipping({ salesCountries: ["CA"] });
    expect(canada).toContain("International Orders");
    expect(canada).toContain("[Buyers are responsible");
  });

  it("includes pickup location, instructions, and hours when pickup is on", () => {
    const md = shipping({
      offersInStorePickup: true,
      pickupLocation: "400 Monroe St",
      pickupInstructions: "Use the alley door.",
      businessHours: [
        {
          days: ["mon", "tue", "wed", "thu", "fri"],
          closed: false,
          open: "09:00",
          close: "17:00",
        },
      ],
    });
    expect(md).toContain("## In-Store Pickup");
    expect(md).toContain("400 Monroe St");
    expect(md).toContain("Use the alley door.");
    expect(md).toContain("Mon–Fri 9:00 AM – 5:00 PM");
  });

  it("names the origin state when set", () => {
    const md = shipping({ originState: "MI" });
    expect(md).toContain("Orders ship from Michigan.");
  });

  it("softens copy when products are off", () => {
    const md = shipping({ featureFlags: { products: false } });
    expect(md).toContain("does not currently offer shipped product orders");
    expect(md).not.toContain("[X] business days");
  });
});

describe("privacy template", () => {
  it("omits analytics unless umami is enabled", () => {
    expect(privacy({ umamiEnabled: false })).not.toContain("## Analytics");
    expect(privacy({ umamiEnabled: true })).toContain("Umami");
  });

  it("mentions marketing email only when the flag is on", () => {
    expect(privacy()).not.toContain("Send marketing emails");
    expect(privacy({ featureFlags: { emailMarketing: true } })).toContain(
      "Send marketing emails",
    );
  });

  it("does not re-explain reCAPTCHA or Sentry", () => {
    const md = privacy({ umamiEnabled: true });
    expect(md).not.toContain("reCAPTCHA");
    expect(md).not.toContain("Sentry");
    expect(md).toContain("SimplePress Privacy Policy");
  });
});

describe("terms template", () => {
  it("fills governing law from addressState", () => {
    expect(terms()).toContain("the State of Michigan");
    expect(terms({ addressState: null })).toContain("[your jurisdiction]");
  });

  it("adds a subscriptions section only when that flag is on", () => {
    expect(terms()).not.toContain("## Subscriptions");
    expect(terms({ featureFlags: { subscriptions: true } })).toContain(
      "## Subscriptions",
    );
  });
});

describe("refund template", () => {
  it("keeps owner fill-ins and drops gift cards / digital downloads", () => {
    const md = refund();
    expect(md).toContain("[X] days");
    expect(md).toContain("[handmade with care / carefully sourced]");
    expect(md).toContain("[Who pays for return shipping?");
    expect(md).not.toContain("Gift cards");
    expect(md).not.toContain("Digital downloads");
  });

  it("uses a short contact-us policy when products are off", () => {
    const md = refund({ featureFlags: { products: false } });
    expect(md).toContain("we'll work with you to make it right");
    expect(md).not.toContain("original packaging");
  });
});

describe("markdownToTiptap", () => {
  it("marks leftover [brackets] as code", () => {
    const doc = markdownToTiptap("Orders ship within [X] days.");
    const text = doc.content[0];
    expect(text).toMatchObject({
      type: "paragraph",
      content: [
        { type: "text", text: "Orders ship within " },
        {
          type: "text",
          text: "[X]",
          marks: [{ type: "code" }],
        },
        { type: "text", text: " days." },
      ],
    });
  });
});
