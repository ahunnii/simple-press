import { describe, expect, it } from "vitest";

import {
  describePolicyDocs,
  joinLabels,
  platformOrigin,
  policyDocsFor,
  policyUrl,
} from "~/lib/legal/policy-docs";

describe("policy-docs", () => {
  it("names the pages behind each bundle", () => {
    expect(describePolicyDocs(["merchant"])).toBe(
      "Seller & Merchant Agreement and Acceptable Use Policy",
    );
    expect(describePolicyDocs(["platform"])).toBe(
      "Terms of Service and Privacy Policy",
    );
    expect(describePolicyDocs(["merchant", "platform"])).toBe(
      "Seller & Merchant Agreement, Acceptable Use Policy, Terms of Service, and Privacy Policy",
    );
  });

  it("de-duplicates repeated bundles", () => {
    expect(policyDocsFor(["platform", "platform"])).toHaveLength(2);
  });

  it("joins labels", () => {
    expect(joinLabels([])).toBe("");
    expect(joinLabels(["A"])).toBe("A");
    expect(joinLabels(["A", "B"])).toBe("A and B");
  });

  it("builds absolute policy URLs", () => {
    expect(policyUrl("simplepress.dev", "seller-merchant")).toBe(
      "https://simplepress.dev/platform/policies/seller-merchant",
    );
    expect(platformOrigin("localhost:3000")).toBe("http://localhost:3000");
    expect(platformOrigin("")).toBe("");
  });
});
