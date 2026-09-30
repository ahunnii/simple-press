import { describe, expect, it } from "vitest";

import { resolveUmscContactDetails, umscTelHref } from "./umsc-contact-details";

const legacy = {
  "umsc.global.customer-service-phone": "(313) 000-1111",
  "umsc.global.footer-tagline": "Old tagline",
  "umsc.contact.hours": "Mon–Sat: by appointment",
  "umsc.global.instagram-url": "https://instagram.com/old",
  "umsc.global.facebook-url": "https://facebook.com/old",
  "umsc.global.tiktok-url": "https://tiktok.com/@old",
};

const hours = [
  { days: ["mon", "tue"], open: "09:00", close: "17:00", closed: false },
];

describe("resolveUmscContactDetails", () => {
  it("prefers Settings and Branding over the legacy saved fields", () => {
    const d = resolveUmscContactDetails({
      phoneNumber: "+1 313 555 0100",
      businessHours: hours,
      siteContent: {
        footerText: "New tagline",
        socialLinks: {
          instagram: "https://instagram.com/new",
          facebook: "https://facebook.com/new",
          tiktok: "https://tiktok.com/@new",
        },
        customFields: legacy,
      },
    });
    expect(d.phone).toBe("+1 313 555 0100");
    expect(d.footerTagline).toBe("New tagline");
    expect(d.hoursRows).toEqual([
      { label: "Mon–Tue", value: "9:00 AM – 5:00 PM" },
    ]);
    expect(d.legacyHours).toBeUndefined();
    expect(d.socials.map((s) => s.url)).toEqual([
      "https://instagram.com/new",
      "https://facebook.com/new",
      "https://tiktok.com/@new",
    ]);
  });

  it("falls back to the legacy saved fields when Settings is blank", () => {
    const d = resolveUmscContactDetails({
      phoneNumber: "  ",
      businessHours: null,
      siteContent: { footerText: "", socialLinks: null, customFields: legacy },
    });
    expect(d.phone).toBe("(313) 000-1111");
    expect(d.footerTagline).toBe("Old tagline");
    expect(d.hoursRows).toEqual([]);
    expect(d.legacyHours).toBe("Mon–Sat: by appointment");
    expect(d.socials.map((s) => [s.key, s.url])).toEqual([
      ["instagram", "https://instagram.com/old"],
      ["facebook", "https://facebook.com/old"],
      ["tiktok", "https://tiktok.com/@old"],
    ]);
  });

  it("returns nothing when neither source has a value", () => {
    const d = resolveUmscContactDetails({
      phoneNumber: "",
      siteContent: {
        footerText: null,
        customFields: {
          "umsc.global.customer-service-phone": "   ",
          "umsc.global.footer-tagline": "",
          "umsc.global.instagram-url": "",
        },
      },
    });
    expect(d).toEqual({
      phone: undefined,
      hoursRows: [],
      legacyHours: undefined,
      footerTagline: undefined,
      socials: [],
    });
    expect(resolveUmscContactDetails(null).socials).toEqual([]);
    expect(resolveUmscContactDetails(undefined).hoursRows).toEqual([]);
  });

  it("merges socials per network: Branding wins, legacy fills gaps", () => {
    const d = resolveUmscContactDetails({
      siteContent: {
        socialLinks: {
          instagram: "https://instagram.com/new",
          // Unsafe Branding value is dropped, so the legacy URL fills in.
          facebook: "javascript:alert(1)",
          youtube: "https://youtube.com/@shop",
        },
        customFields: {
          ...legacy,
          // Unsafe legacy value is dropped too.
          "umsc.global.tiktok-url": "javascript:alert(1)",
        },
      },
    });
    expect(d.socials.map((s) => [s.key, s.url])).toEqual([
      ["instagram", "https://instagram.com/new"],
      ["facebook", "https://facebook.com/old"],
      ["youtube", "https://youtube.com/@shop"],
    ]);
    // Plain data only — safe to pass to a client component.
    expect(d.socials[0]).toEqual({
      key: "instagram",
      url: "https://instagram.com/new",
      ariaLabel: "Instagram",
    });
  });

  it("ignores non-string legacy values", () => {
    const d = resolveUmscContactDetails({
      siteContent: {
        customFields: { "umsc.global.customer-service-phone": 5551234 },
      },
    });
    expect(d.phone).toBeUndefined();
  });
});

describe("umscTelHref", () => {
  it("builds a digits-only tel: href", () => {
    expect(umscTelHref("+1 (313) 555-0100")).toBe("tel:+13135550100");
  });
});
