import { describe, expect, it } from "vitest";

import { dreamGlobalData } from "../global";
import {
  dreamTelHref,
  resolveDreamContactDetails,
} from "../shared/dream-contact-details";
import { resolveDreamFields } from "./resolve-fields";

describe("resolveDreamFields", () => {
  it("returns the declared default for an unset key", () => {
    const f = resolveDreamFields({}, [
      "dream.global.header-cta-label",
      "dream.global.header-cta-url",
      "dream.global.footer-signoff-accent",
    ]);
    expect(f["dream.global.header-cta-label"]).toBe("Estimate Quote");
    expect(f["dream.global.header-cta-url"]).toBe("/contact");
    expect(f["dream.global.footer-signoff-accent"]).toBe("a theme.");
  });

  it("keeps a saved blank value blank instead of restoring the default", () => {
    const f = resolveDreamFields(
      {
        "dream.global.header-cta-label": "",
        "dream.global.footer-signoff-accent": "   ",
      },
      ["dream.global.header-cta-label", "dream.global.footer-signoff-accent"],
    );
    expect(f["dream.global.header-cta-label"]).toBe("");
    expect(f["dream.global.footer-signoff-accent"]).toBe("");
  });

  it("runs url fields through safeHref", () => {
    expect(
      resolveDreamFields(
        { "dream.global.header-cta-url": "javascript:alert(1)" },
        ["dream.global.header-cta-url"],
      )["dream.global.header-cta-url"],
    ).toBe("");
    expect(
      resolveDreamFields({ "dream.global.header-cta-url": " /book " }, [
        "dream.global.header-cta-url",
      ])["dream.global.header-cta-url"],
    ).toBe("/book");
  });

  it("tolerates non-object customFields", () => {
    expect(
      resolveDreamFields(null, ["dream.global.service-area"])[
        "dream.global.service-area"
      ],
    ).toBe("Serving the metro area and beyond.");
  });

  it("declares none of the retired Settings-owned keys", () => {
    const keys = dreamGlobalData.map((field) => field.key);
    expect(keys).not.toContain("dream.global.contact-email");
    expect(keys).not.toContain("dream.global.announcement-text");
    expect(keys).toContain("dream.global.service-area");
  });
});

describe("resolveDreamContactDetails", () => {
  const legacy = {
    "dream.global.contact-email": "old@example.com",
    "dream.global.contact-phone": "(555) 000-1111",
    "dream.global.contact-hours": "Mon–Fri 9–5",
    "dream.global.footer-tagline": "Old tagline",
  };

  it("prefers Settings over the legacy saved fields", () => {
    const d = resolveDreamContactDetails({
      supportEmail: "hello@example.com",
      phoneNumber: "+1 555 123 4567",
      businessHours: [
        { days: ["mon", "tue"], open: "09:00", close: "17:00", closed: false },
      ],
      siteContent: { footerText: "New tagline", customFields: legacy },
    });
    expect(d.email).toBe("hello@example.com");
    expect(d.phone).toBe("+1 555 123 4567");
    expect(d.hoursRows.length).toBeGreaterThan(0);
    expect(d.legacyHours).toBeUndefined();
    expect(d.footerTagline).toBe("New tagline");
  });

  it("falls back to the legacy saved fields when Settings is blank", () => {
    const d = resolveDreamContactDetails({
      supportEmail: "  ",
      phoneNumber: null,
      businessHours: null,
      siteContent: { footerText: "", customFields: legacy },
    });
    expect(d.email).toBe("old@example.com");
    expect(d.phone).toBe("(555) 000-1111");
    expect(d.hoursRows).toEqual([]);
    expect(d.legacyHours).toBe("Mon–Fri 9–5");
    expect(d.footerTagline).toBe("Old tagline");
  });

  it("returns nothing when neither source has a value", () => {
    const d = resolveDreamContactDetails({
      supportEmail: null,
      phoneNumber: "",
      siteContent: {
        footerText: null,
        customFields: { "dream.global.contact-email": "" },
      },
    });
    expect(d).toEqual({
      email: undefined,
      phone: undefined,
      hoursRows: [],
      legacyHours: undefined,
      footerTagline: undefined,
    });
    expect(resolveDreamContactDetails(null).hoursRows).toEqual([]);
  });

  it("builds a digits-only tel: href", () => {
    expect(dreamTelHref("+1 (555) 123-4567")).toBe("tel:+15551234567");
  });
});
