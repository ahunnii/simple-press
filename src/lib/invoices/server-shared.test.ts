import { describe, expect, it } from "vitest";

import type { IssuerBusiness } from "./server-shared";

import {
  blankToNull,
  buildIssuerSnapshot,
  invoiceDisplayNumber,
  parsePriceLabelCents,
  paymentRecordMethodLabel,
} from "./server-shared";

describe("parsePriceLabelCents", () => {
  it.each([
    ["$45", 4500],
    ["45", 4500],
    ["$45.5", 4550],
    ["$45.00", 4500],
    ["$1,200 per visit", 120000],
    ["From $80", 8000],
    ["$0", 0],
  ])("parses %s", (label, cents) => {
    expect(parsePriceLabelCents(label)).toBe(cents);
  });

  it.each([
    [null],
    [undefined],
    [""],
    ["Free"],
    ["Call for pricing"],
    ["$40–$60"],
    ["$45/hr, 2 hr minimum"],
    ["$4.999"],
    ["12,34"],
  ])("returns null for %s", (label) => {
    expect(parsePriceLabelCents(label)).toBeNull();
  });
});

describe("blankToNull", () => {
  it("maps missing and whitespace-only to null and trims the rest", () => {
    expect(blankToNull(undefined)).toBeNull();
    expect(blankToNull(null)).toBeNull();
    expect(blankToNull("   ")).toBeNull();
    expect(blankToNull("  hi ")).toBe("hi");
  });
});

describe("invoiceDisplayNumber / paymentRecordMethodLabel", () => {
  it("formats with the current padding", () => {
    expect(
      invoiceDisplayNumber({ numberPrefix: "INV-", invoiceNumber: 12 }, 4),
    ).toBe("INV-0012");
  });

  it("labels known methods and falls back to Other", () => {
    expect(paymentRecordMethodLabel("bank_transfer")).toBe("Bank transfer");
    expect(paymentRecordMethodLabel("card")).toBe("Card");
    expect(paymentRecordMethodLabel("mystery")).toBe("Other");
  });
});

describe("buildIssuerSnapshot", () => {
  const base: IssuerBusiness = {
    name: "Test Store",
    ownerEmail: "owner@test.dev",
    supportEmail: null,
    phoneNumber: null,
    businessAddress: null,
    addressStreet: null,
    addressCity: null,
    addressState: null,
    addressPostalCode: null,
    siteContent: null,
  };

  it("prefers structured address parts and the support email", () => {
    expect(
      buildIssuerSnapshot({
        ...base,
        supportEmail: "help@test.dev",
        phoneNumber: " 555-0100 ",
        businessAddress: "ignored, when parts exist",
        addressStreet: "1 Main St",
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
        siteContent: {
          logoUrl: "https://cdn.test/logo.png",
          primaryColor: "#112233",
          accentColor: "#3b82f6",
        },
      }),
    ).toEqual({
      name: "Test Store",
      email: "help@test.dev",
      phone: "555-0100",
      addressLines: ["1 Main St", "Detroit, MI 48201"],
      logoUrl: "https://cdn.test/logo.png",
      accentColor: "#112233",
    });
  });

  it("falls back to the owner email, free-text address lines and no color", () => {
    expect(
      buildIssuerSnapshot({
        ...base,
        businessAddress: "1 Main St\n Detroit, MI 48201 \n",
        siteContent: {
          logoUrl: null,
          primaryColor: "red; background:url(x)",
          accentColor: null,
        },
      }),
    ).toEqual({
      name: "Test Store",
      email: "owner@test.dev",
      phone: null,
      addressLines: ["1 Main St", "Detroit, MI 48201"],
      logoUrl: null,
      accentColor: null,
    });
  });
});
