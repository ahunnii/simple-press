import { describe, expect, it } from "vitest";

import type { BusinessTypeId, SetupStepKey } from "./setup-plan";
import type { SetupFacts, SetupStatusInput } from "./setup-steps";
import { resolveFlags } from "~/lib/features/resolve-flags";

import { FEATURE_PRESETS, resolveSetupPlan, SETUP_PRESETS } from "./setup-plan";
import { computeSetupStatus } from "./setup-steps";

// A brand-new store: nothing done yet, shipping on the schema default.
const EMPTY_FACTS: SetupFacts = {
  stripeAccountId: null,
  customDomain: null,
  productCount: 0,
  serviceCount: 0,
  stripeAutoTaxEnabled: false,
  shippingType: "free",
  offersInStorePickup: false,
  venmoHandle: null,
  cashAppHandle: null,
  phoneNumber: null,
  supportEmail: null,
  addressStreet: null,
  policiesLive: false,
  siteContent: null,
};

/** A store of `type` as the create dialog makes it: preset levels + flags. */
function typed(
  type: BusinessTypeId,
  overrides: Partial<Omit<SetupStatusInput, "facts">> & {
    facts?: Partial<SetupFacts>;
  } = {},
) {
  return computeSetupStatus({
    plan: resolveSetupPlan({
      businessType: type,
      setupSteps: SETUP_PRESETS[type],
    }),
    isFeatureEnabled: resolveFlags(FEATURE_PRESETS[type]).isEnabled,
    confirmations: {},
    ...overrides,
    facts: { ...EMPTY_FACTS, ...overrides.facts },
  });
}

/** A store created before business types existed. */
function legacy(
  facts: Partial<SetupFacts> = {},
  featureFlags: Record<string, boolean> = {},
) {
  return computeSetupStatus({
    plan: resolveSetupPlan({ businessType: null, setupSteps: null }),
    isFeatureEnabled: resolveFlags(featureFlags).isEnabled,
    confirmations: {},
    facts: { ...EMPTY_FACTS, ...facts },
  });
}

const keysOf = (status: ReturnType<typeof computeSetupStatus>) =>
  status.items.map((i) => i.key);

const levelOf = (
  status: ReturnType<typeof computeSetupStatus>,
  key: SetupStepKey,
) => status.items.find((i) => i.key === key)?.level;

describe("computeSetupStatus — visible steps per preset", () => {
  it("products", () => {
    const s = typed("products");
    expect(keysOf(s)).toEqual([
      "businessCreated",
      "domainConfigured",
      "stripeConnected",
      "firstProductAdded",
      "salesTax",
      "shippingPickup",
      "contactInfo",
      "policiesLive",
      "storefrontCustomized",
    ]);
    expect(s.businessType).toBe("products");
    expect(s.requiredRemaining).toBe(5);
    expect(levelOf(s, "contactInfo")).toBe("optional");
  });

  it("services", () => {
    const s = typed("services");
    expect(keysOf(s)).toEqual([
      "businessCreated",
      "domainConfigured",
      "stripeConnected",
      "firstServiceAdded",
      "contactInfo",
      "policiesLive",
      "storefrontCustomized",
    ]);
    expect(levelOf(s, "stripeConnected")).toBe("optional");
    expect(s.requiredRemaining).toBe(3);
  });

  it("informational", () => {
    const s = typed("informational");
    expect(keysOf(s)).toEqual([
      "businessCreated",
      "domainConfigured",
      "contactInfo",
      "storefrontCustomized",
    ]);
    expect(s.requiredRemaining).toBe(2);
  });

  it("donations", () => {
    const s = typed("donations");
    expect(keysOf(s)).toEqual([
      "businessCreated",
      "domainConfigured",
      "stripeConnected",
      "donationsSetup",
      "contactInfo",
      "policiesLive",
      "storefrontCustomized",
    ]);
    expect(s.requiredRemaining).toBe(2);
  });

  it("always opens with a done, optional businessCreated row", () => {
    const first = typed("informational").items[0];
    expect(first).toMatchObject({
      key: "businessCreated",
      score: 1,
      level: "optional",
      weight: 1,
    });
  });
});

describe("computeSetupStatus — feature flags hide steps", () => {
  it("hides product steps when products is off, whatever their level", () => {
    const s = typed("products", {
      isFeatureEnabled: resolveFlags({ products: false }).isEnabled,
    });
    expect(keysOf(s)).not.toContain("firstProductAdded");
    expect(keysOf(s)).not.toContain("salesTax");
    expect(keysOf(s)).not.toContain("shippingPickup");
  });

  it("hides the donations step when donations is off", () => {
    const s = typed("donations", {
      isFeatureEnabled: resolveFlags({ products: false, donations: false })
        .isEnabled,
    });
    expect(keysOf(s)).not.toContain("donationsSetup");
  });

  it("hides the services step when services is off", () => {
    const s = typed("services", {
      isFeatureEnabled: resolveFlags({ products: false }).isEnabled,
    });
    expect(keysOf(s)).not.toContain("firstServiceAdded");
  });
});

describe("computeSetupStatus — legacy (businessType null)", () => {
  it("shows today's 5 rows", () => {
    const s = legacy();
    expect(s.businessType).toBeNull();
    expect(keysOf(s)).toEqual([
      "businessCreated",
      "domainConfigured",
      "stripeConnected",
      "firstProductAdded",
      "storefrontCustomized",
    ]);
    expect(levelOf(s, "storefrontCustomized")).toBe("optional");
  });

  it("gates on Stripe + product + domain, exactly like isSetupGateComplete", () => {
    const all = {
      stripeAccountId: "acct_1",
      productCount: 1,
      customDomain: "shop.example",
    };
    expect(legacy(all).requiredComplete).toBe(true);
    expect(legacy({ ...all, stripeAccountId: null }).requiredComplete).toBe(
      false,
    );
    expect(legacy({ ...all, productCount: 0 }).requiredComplete).toBe(false);
    expect(legacy({ ...all, customDomain: null }).requiredComplete).toBe(false);
  });

  it("ignores new-step facts (sales tax, contact, policies are off)", () => {
    const s = legacy({
      stripeAccountId: "acct_1",
      productCount: 1,
      customDomain: "shop.example",
      siteContent: { logoUrl: "logo.png", customFields: null },
    });
    expect(s.isComplete).toBe(true);
    expect(s.progress).toBeNull();
  });

  it("drops the product step when the products flag is off (no dead end)", () => {
    const s = legacy(
      { stripeAccountId: "acct_1", customDomain: "shop.example" },
      { products: false },
    );
    expect(keysOf(s)).not.toContain("firstProductAdded");
    expect(s.requiredComplete).toBe(true);
  });
});

describe("computeSetupStatus — requiredComplete vs isComplete", () => {
  it("passes the gate with optional steps still open", () => {
    const s = typed("informational", {
      facts: { customDomain: "shop.example", phoneNumber: "555-0100" },
    });
    expect(s.requiredComplete).toBe(true);
    expect(s.requiredRemaining).toBe(0);
    // storefrontCustomized (optional) is still open.
    expect(s.isComplete).toBe(false);
    expect(s.progress).toMatchObject({ completed: 3, total: 4 });
    expect(s.progress?.nextStep?.href).toBe("/editor");
  });

  it("suggests a required step before an earlier optional one", () => {
    const s = typed("donations", {
      facts: { customDomain: "shop.example" },
    });
    // stripeConnected (optional) comes first in catalog order, but the
    // required donationsSetup step wins.
    expect(s.next?.key).toBe("donationsSetup");
  });

  it("goes null-progress once every visible step is done", () => {
    const s = typed("informational", {
      facts: {
        customDomain: "shop.example",
        supportEmail: "hi@shop.example",
        siteContent: { logoUrl: null, customFields: { "hero.title": "Hi" } },
      },
    });
    expect(s.isComplete).toBe(true);
    expect(s.requiredComplete).toBe(true);
    expect(s.progress).toBeNull();
  });
});

describe("computeSetupStatus — completion rules", () => {
  const salesTax = (s: ReturnType<typeof computeSetupStatus>) =>
    s.items.find((i) => i.key === "salesTax");

  it("sales tax is done by Stripe automatic tax", () => {
    const item = salesTax(
      typed("products", { facts: { stripeAutoTaxEnabled: true } }),
    );
    expect(item).toMatchObject({
      score: 1,
      confirmed: false,
      confirmable: true,
    });
  });

  it("sales tax is done by an owner confirmation", () => {
    const item = salesTax(
      typed("products", {
        confirmations: { salesTax: "2026-10-12T00:00:00.000Z" },
      }),
    );
    expect(item).toMatchObject({ score: 1, confirmed: true });
  });

  it("sales tax is open with neither", () => {
    expect(salesTax(typed("products"))?.score).toBe(0);
  });

  it("ignores confirmations on non-confirmable steps", () => {
    const s = typed("products", {
      confirmations: { firstProductAdded: "2026-10-12T00:00:00.000Z" },
    });
    expect(s.items.find((i) => i.key === "firstProductAdded")).toMatchObject({
      score: 0,
      confirmed: false,
      confirmable: false,
    });
  });

  it("shipping is done once changed from the free default, pickup is on, or confirmed", () => {
    const shipping = (input: Parameters<typeof typed>[1]) =>
      typed("products", input).items.find((i) => i.key === "shippingPickup")
        ?.score;
    expect(shipping({})).toBe(0);
    expect(shipping({ facts: { shippingType: "flat_rate" } })).toBe(1);
    expect(shipping({ facts: { offersInStorePickup: true } })).toBe(1);
    expect(
      shipping({ confirmations: { shippingPickup: "2026-10-12T00:00:00Z" } }),
    ).toBe(1);
  });

  it("donations are done via Stripe, Venmo or Cash App", () => {
    const donations = (facts: Partial<SetupFacts>) =>
      typed("donations", { facts }).items.find(
        (i) => i.key === "donationsSetup",
      )?.score;
    expect(donations({})).toBe(0);
    expect(donations({ venmoHandle: "  " })).toBe(0);
    expect(donations({ venmoHandle: "shopname" })).toBe(1);
    expect(donations({ cashAppHandle: "shopname" })).toBe(1);
    expect(donations({ stripeAccountId: "acct_1" })).toBe(1);
  });

  it("services, contact info and policies read their facts", () => {
    const s = typed("services", {
      facts: {
        serviceCount: 2,
        addressStreet: "1 Main St",
        policiesLive: true,
      },
    });
    const score = (key: SetupStepKey) =>
      s.items.find((i) => i.key === key)?.score;
    expect(score("firstServiceAdded")).toBe(1);
    expect(score("contactInfo")).toBe(1);
    expect(score("policiesLive")).toBe(1);
  });

  it("links each step somewhere useful", () => {
    const hrefs = Object.fromEntries(
      typed("products").items.map((i) => [i.key, i.href]),
    );
    expect(hrefs).toMatchObject({
      domainConfigured: "/admin/welcome",
      stripeConnected: "/admin/welcome",
      firstProductAdded: "/admin/products/new",
      salesTax: "/admin/settings/integrations",
      shippingPickup: "/admin/settings/shipping",
      contactInfo: "/admin/settings/general",
      policiesLive: "/admin/content/policies",
      storefrontCustomized: "/editor",
    });
  });
});

describe("computeSetupStatus — progress percent", () => {
  it("is unweighted, so it agrees with the step count", () => {
    // Fresh products store: 1 of 9 done (only "Store created").
    const fresh = typed("products");
    expect(fresh.completed).toBe(1);
    expect(fresh.total).toBe(9);
    expect(fresh.percent).toBe(Math.round((1 / 9) * 100));

    // One required step more: 2 of 9, not the weighted 21%.
    const oneMore = typed("products", { confirmations: { salesTax: "x" } });
    expect(oneMore.completed).toBe(2);
    expect(oneMore.percent).toBe(Math.round((2 / 9) * 100));
  });

  it("still suggests a required step next", () => {
    expect(typed("products").next?.level).toBe("required");
  });
});

describe("FEATURE_PRESETS — re-typing undoes the previous type", () => {
  it("every type sets all three type-defining flags explicitly", () => {
    for (const preset of Object.values(FEATURE_PRESETS)) {
      expect(Object.keys(preset).sort()).toEqual(
        ["donations", "products", "services"].sort(),
      );
    }
  });

  it("services → products (apply defaults) turns products back on", () => {
    const merged = { ...FEATURE_PRESETS.services, ...FEATURE_PRESETS.products };
    const s = typed("products", {
      isFeatureEnabled: resolveFlags(merged).isEnabled,
    });
    expect(keysOf(s)).toContain("firstProductAdded");
    expect(resolveFlags(merged).isEnabled("services")).toBe(false);
  });
});
