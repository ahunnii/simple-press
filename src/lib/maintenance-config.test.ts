import { describe, expect, it, vi } from "vitest";

import {
  maintenanceCtaSchema,
  maintenanceHeadlineSchema,
  maintenanceImageSchema,
  maintenanceLocationSchema,
  maintenanceMessageSchema,
  maintenanceOverlineSchema,
  maintenanceWallClockSchema,
  normalizeMaintenanceMessage,
  normalizeMaintenanceText,
  resolveMaintenanceCta,
  resolveMaintenanceLaunch,
  wrapPlainTextAsTiptapDoc,
} from "./maintenance-config";

describe("wrapPlainTextAsTiptapDoc", () => {
  it("wraps plain text in a single-paragraph doc", () => {
    expect(wrapPlainTextAsTiptapDoc("hello")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello" }],
        },
      ],
    });
  });
});

describe("normalizeMaintenanceMessage", () => {
  it("returns null for null/undefined", () => {
    expect(normalizeMaintenanceMessage(null)).toBeNull();
    expect(normalizeMaintenanceMessage(undefined)).toBeNull();
  });

  it("returns null for empty/whitespace-only strings", () => {
    expect(normalizeMaintenanceMessage("")).toBeNull();
    expect(normalizeMaintenanceMessage("   ")).toBeNull();
    expect(normalizeMaintenanceMessage("\n\t")).toBeNull();
  });

  it("wraps a legacy plain-text string into a doc", () => {
    expect(normalizeMaintenanceMessage("legacy note")).toEqual(
      wrapPlainTextAsTiptapDoc("legacy note"),
    );
  });

  it("trims a legacy plain-text string before wrapping", () => {
    expect(normalizeMaintenanceMessage("  legacy note  ")).toEqual(
      wrapPlainTextAsTiptapDoc("legacy note"),
    );
  });

  it("returns a valid, non-empty doc object as-is", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hi there" }] },
      ],
    };
    expect(normalizeMaintenanceMessage(doc)).toBe(doc);
  });

  it("returns null for a doc with empty content array", () => {
    expect(
      normalizeMaintenanceMessage({ type: "doc", content: [] }),
    ).toBeNull();
  });

  it("returns null for a doc containing only an empty paragraph", () => {
    expect(
      normalizeMaintenanceMessage({
        type: "doc",
        content: [{ type: "paragraph", content: [] }],
      }),
    ).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(normalizeMaintenanceMessage(42)).toBeNull();
    expect(normalizeMaintenanceMessage([])).toBeNull();
    expect(normalizeMaintenanceMessage({ type: "paragraph" })).toBeNull();
  });
});

describe("resolveMaintenanceCta", () => {
  const business = {
    phoneNumber: "555-123-4567",
    supportEmail: "support@example.com",
  };
  const noContact = { phoneNumber: null, supportEmail: null };

  describe("external", () => {
    it("resolves a valid external CTA to its provided URL", () => {
      expect(
        resolveMaintenanceCta(
          { type: "external", label: "Visit us", value: "https://example.com" },
          business,
        ),
      ).toEqual({
        type: "external",
        label: "Visit us",
        href: "https://example.com",
      });
    });

    it("returns null when the URL is missing", () => {
      expect(
        resolveMaintenanceCta(
          { type: "external", label: "Visit us" },
          business,
        ),
      ).toBeNull();
    });

    it("returns null when the URL is malformed", () => {
      expect(
        resolveMaintenanceCta(
          { type: "external", label: "Visit us", value: "not-a-url" },
          business,
        ),
      ).toBeNull();
    });

    it("returns null for a non-http(s) scheme", () => {
      expect(
        resolveMaintenanceCta(
          {
            type: "external",
            label: "Visit us",
            value: "ftp://example.com/file",
          },
          business,
        ),
      ).toBeNull();
    });

    it("returns null for invalid shape / null / undefined input", () => {
      expect(resolveMaintenanceCta(null, business)).toBeNull();
      expect(resolveMaintenanceCta(undefined, business)).toBeNull();
      expect(resolveMaintenanceCta("garbage", business)).toBeNull();
      expect(resolveMaintenanceCta({ type: "bogus" }, business)).toBeNull();
    });
  });

  describe("call", () => {
    it("strips non-digit characters from an explicit value but keeps a leading +", () => {
      expect(
        resolveMaintenanceCta(
          { type: "call", label: "Call us", value: "+1 (313) 555-0199" },
          business,
        ),
      ).toEqual({ type: "call", label: "Call us", href: "tel:+13135550199" });
    });

    it("strips a leading + only when present in the effective number", () => {
      expect(
        resolveMaintenanceCta(
          { type: "call", label: "Call us", value: "(313) 555-0199" },
          business,
        ),
      ).toEqual({ type: "call", label: "Call us", href: "tel:3135550199" });
    });

    it("falls back to the business phone number when no value is given", () => {
      expect(
        resolveMaintenanceCta({ type: "call", label: "Call us" }, business),
      ).toEqual({
        type: "call",
        label: "Call us",
        href: `tel:${business.phoneNumber.replace(/\D/g, "")}`,
      });
    });

    it("returns null when there is no value and no business phone", () => {
      expect(
        resolveMaintenanceCta({ type: "call", label: "Call us" }, noContact),
      ).toBeNull();
    });

    it("returns null when the label is too long", () => {
      expect(
        resolveMaintenanceCta(
          { type: "call", label: "x".repeat(81), value: "555-123-4567" },
          business,
        ),
      ).toBeNull();
    });

    it("returns null when the label is empty", () => {
      expect(
        resolveMaintenanceCta(
          { type: "call", label: "", value: "555-123-4567" },
          business,
        ),
      ).toBeNull();
    });
  });

  describe("email", () => {
    it("resolves an explicit email value, trimmed, to a mailto: href", () => {
      expect(
        resolveMaintenanceCta(
          { type: "email", label: "Email us", value: "  hello@example.com  " },
          business,
        ),
      ).toEqual({
        type: "email",
        label: "Email us",
        href: "mailto:hello@example.com",
      });
    });

    it("falls back to the business support email when no value is given", () => {
      expect(
        resolveMaintenanceCta({ type: "email", label: "Email us" }, business),
      ).toEqual({
        type: "email",
        label: "Email us",
        href: `mailto:${business.supportEmail}`,
      });
    });

    it("returns null when there is no value and no business support email", () => {
      expect(
        resolveMaintenanceCta({ type: "email", label: "Email us" }, noContact),
      ).toBeNull();
    });
  });
});

describe("maintenanceMessageSchema", () => {
  it("accepts a valid doc", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "We'll be back soon." }],
        },
      ],
    };
    expect(maintenanceMessageSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects a doc whose serialized size exceeds 20,000 characters", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a".repeat(25_000) }],
        },
      ],
    };
    const result = maintenanceMessageSchema.safeParse(doc);
    expect(result.success).toBe(false);
  });
});

describe("maintenanceCtaSchema", () => {
  it("accepts a valid external CTA", () => {
    expect(
      maintenanceCtaSchema.safeParse({
        type: "external",
        label: "Visit us",
        value: "https://example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects an external CTA with a non-http(s) URL", () => {
    expect(
      maintenanceCtaSchema.safeParse({
        type: "external",
        label: "Visit us",
        value: "ftp://example.com",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid call CTA with no value", () => {
    expect(
      maintenanceCtaSchema.safeParse({ type: "call", label: "Call us" })
        .success,
    ).toBe(true);
  });

  it("rejects a call CTA with a malformed phone value", () => {
    expect(
      maintenanceCtaSchema.safeParse({
        type: "call",
        label: "Call us",
        value: "abc",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid email CTA", () => {
    expect(
      maintenanceCtaSchema.safeParse({
        type: "email",
        label: "Email us",
        value: "hello@example.com",
      }).success,
    ).toBe(true);
  });

  it("rejects an email CTA with a malformed email value", () => {
    expect(
      maintenanceCtaSchema.safeParse({
        type: "email",
        label: "Email us",
        value: "not-an-email",
      }).success,
    ).toBe(false);
  });
});

// `~/lib/maintenance.ts` imports the real `~/server/db` at module scope (for
// `getPlatformMaintenance`). Mocking it here — the same pattern used by
// `src/lib/auth/allowed-hosts.test.ts` and `src/lib/captcha/known-hosts.test.ts`
// — keeps this a pure unit test of `resolveStorefrontMaintenance` (which never
// touches `db` itself) without constructing a real Prisma client.
vi.mock("~/server/db", () => ({ db: {} }));

describe("resolveStorefrontMaintenance", () => {
  const business = {
    phoneNumber: "555-123-4567",
    supportEmail: "support@example.com",
  };

  it("returns platform scope with a forced maintenance variant when platform maintenance is active", async () => {
    const { resolveStorefrontMaintenance } = await import("./maintenance");

    const result = resolveStorefrontMaintenance({
      platform: { active: true, message: "Down for scheduled maintenance." },
      business: {
        maintenanceMode: false,
        maintenanceVariant: "coming_soon",
        maintenanceMessage: null,
        maintenanceCta: null,
        maintenanceOverline: null,
        maintenanceHeadline: null,
        maintenanceImage: null,
        maintenanceLaunchAt: null,
        maintenanceLaunchEndAt: null,
        maintenanceLocation: null,
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
        timeZone: "America/Detroit",
      },
    });

    expect(result).toEqual({
      active: true,
      scope: "platform",
      variant: "maintenance",
      message: "Down for scheduled maintenance.",
    });
  });

  it("returns business scope with resolved message + CTA when only business maintenance is active", async () => {
    const { resolveStorefrontMaintenance } = await import("./maintenance");

    const result = resolveStorefrontMaintenance({
      platform: { active: false, message: null },
      business: {
        maintenanceMode: true,
        maintenanceVariant: "coming_soon",
        maintenanceMessage: "back soon!",
        maintenanceCta: {
          type: "external",
          label: "Follow us",
          value: "https://example.com",
        },
        maintenanceOverline: "  Opening soon  ",
        maintenanceHeadline: "The shop opens Sep 26",
        maintenanceImage: "https://cdn.example.com/business-sites/b1/flyer.png",
        maintenanceLaunchAt: new Date("2026-09-26T16:00:00Z"),
        maintenanceLaunchEndAt: new Date("2026-09-26T23:00:00Z"),
        maintenanceLocation: "  123 Main St  ",
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
        timeZone: "America/Detroit",
      },
    });

    expect(result).toEqual({
      active: true,
      scope: "business",
      variant: "coming_soon",
      message: wrapPlainTextAsTiptapDoc("back soon!"),
      cta: {
        type: "external",
        label: "Follow us",
        href: "https://example.com",
      },
      overline: "Opening soon",
      headline: "The shop opens Sep 26",
      image: "https://cdn.example.com/business-sites/b1/flyer.png",
      location: "123 Main St",
      launch: {
        startAt: "2026-09-26T16:00:00.000Z",
        endAt: "2026-09-26T23:00:00.000Z",
        dateText: "Sat, Sep 26",
        timeText: "12:00 – 7:00 PM",
        dateTimeAttr: "2026-09-26T16:00:00.000Z",
      },
    });
  });

  it("drops an invalid image URL and leaves blank text fields null", async () => {
    const { resolveStorefrontMaintenance } = await import("./maintenance");

    const result = resolveStorefrontMaintenance({
      platform: { active: false, message: null },
      business: {
        maintenanceMode: true,
        maintenanceVariant: "maintenance",
        maintenanceMessage: null,
        maintenanceCta: null,
        maintenanceOverline: "   ",
        maintenanceHeadline: null,
        maintenanceImage: "javascript:alert(1)",
        maintenanceLaunchAt: null,
        maintenanceLaunchEndAt: new Date("2026-09-26T23:00:00Z"),
        maintenanceLocation: 42,
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
        timeZone: "America/Detroit",
      },
    });

    expect(result).toEqual({
      active: true,
      scope: "business",
      variant: "maintenance",
      message: null,
      cta: null,
      overline: null,
      headline: null,
      image: null,
      location: null,
      launch: null,
    });
  });

  it("returns { active: false } when neither platform nor business maintenance is active", async () => {
    const { resolveStorefrontMaintenance } = await import("./maintenance");

    const result = resolveStorefrontMaintenance({
      platform: { active: false, message: null },
      business: {
        maintenanceMode: false,
        maintenanceVariant: "maintenance",
        maintenanceMessage: null,
        maintenanceCta: null,
        maintenanceOverline: null,
        maintenanceHeadline: null,
        maintenanceImage: null,
        maintenanceLaunchAt: null,
        maintenanceLaunchEndAt: null,
        maintenanceLocation: null,
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
        timeZone: "America/Detroit",
      },
    });

    expect(result).toEqual({ active: false });
  });
});

describe("maintenanceOverlineSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(maintenanceOverlineSchema.parse("  Opening soon  ")).toBe(
      "Opening soon",
    );
  });

  it("accepts an empty string (normalized to null downstream)", () => {
    expect(maintenanceOverlineSchema.safeParse("").success).toBe(true);
  });

  it("accepts exactly 80 characters", () => {
    expect(maintenanceOverlineSchema.safeParse("x".repeat(80)).success).toBe(
      true,
    );
  });

  it("rejects 81 characters", () => {
    expect(maintenanceOverlineSchema.safeParse("x".repeat(81)).success).toBe(
      false,
    );
  });

  it("measures length after trimming", () => {
    expect(
      maintenanceOverlineSchema.safeParse(`  ${"x".repeat(80)}  `).success,
    ).toBe(true);
  });
});

describe("maintenanceHeadlineSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(maintenanceHeadlineSchema.parse("  Back soon  ")).toBe("Back soon");
  });

  it("accepts exactly 160 characters", () => {
    expect(maintenanceHeadlineSchema.safeParse("x".repeat(160)).success).toBe(
      true,
    );
  });

  it("rejects 161 characters", () => {
    expect(maintenanceHeadlineSchema.safeParse("x".repeat(161)).success).toBe(
      false,
    );
  });
});

describe("maintenanceLocationSchema", () => {
  it("trims surrounding whitespace", () => {
    expect(maintenanceLocationSchema.parse("  123 Main St  ")).toBe(
      "123 Main St",
    );
  });

  it("accepts exactly 200 characters", () => {
    expect(maintenanceLocationSchema.safeParse("x".repeat(200)).success).toBe(
      true,
    );
  });

  it("rejects 201 characters", () => {
    expect(maintenanceLocationSchema.safeParse("x".repeat(201)).success).toBe(
      false,
    );
  });
});

describe("maintenanceImageSchema", () => {
  it("accepts an https URL and trims it", () => {
    expect(
      maintenanceImageSchema.parse("  https://cdn.example.com/a.png  "),
    ).toBe("https://cdn.example.com/a.png");
  });

  it("accepts an http URL", () => {
    expect(
      maintenanceImageSchema.safeParse("http://cdn.example.com/a.png").success,
    ).toBe(true);
  });

  it("rejects a non-http(s) scheme", () => {
    expect(
      maintenanceImageSchema.safeParse("ftp://cdn.example.com/a.png").success,
    ).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(
      maintenanceImageSchema.safeParse("javascript:alert(1)").success,
    ).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(maintenanceImageSchema.safeParse("not-a-url").success).toBe(false);
  });

  it("rejects a URL longer than 500 characters", () => {
    expect(
      maintenanceImageSchema.safeParse(
        `https://cdn.example.com/${"a".repeat(500)}.png`,
      ).success,
    ).toBe(false);
  });
});

describe("maintenanceWallClockSchema", () => {
  it('accepts what <input type="datetime-local"> emits', () => {
    expect(maintenanceWallClockSchema.parse("2026-09-26T12:00")).toBe(
      "2026-09-26T12:00",
    );
  });

  it("trims before matching", () => {
    expect(maintenanceWallClockSchema.parse("  2026-09-26T12:00  ")).toBe(
      "2026-09-26T12:00",
    );
  });

  it("rejects a date with no time", () => {
    expect(maintenanceWallClockSchema.safeParse("2026-09-26").success).toBe(
      false,
    );
  });

  it("rejects a value carrying seconds", () => {
    expect(
      maintenanceWallClockSchema.safeParse("2026-09-26T12:00:00").success,
    ).toBe(false);
  });

  it("rejects garbage", () => {
    expect(maintenanceWallClockSchema.safeParse("garbage").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(maintenanceWallClockSchema.safeParse("").success).toBe(false);
  });
});

describe("normalizeMaintenanceText", () => {
  it("trims a string", () => {
    expect(normalizeMaintenanceText("  Opening soon  ")).toBe("Opening soon");
  });

  it("returns null for empty / whitespace-only strings", () => {
    expect(normalizeMaintenanceText("")).toBeNull();
    expect(normalizeMaintenanceText("   ")).toBeNull();
    expect(normalizeMaintenanceText("\n\t")).toBeNull();
  });

  it("returns null for null / undefined", () => {
    expect(normalizeMaintenanceText(null)).toBeNull();
    expect(normalizeMaintenanceText(undefined)).toBeNull();
  });

  it("returns null for any non-string", () => {
    expect(normalizeMaintenanceText(42)).toBeNull();
    expect(normalizeMaintenanceText({})).toBeNull();
    expect(normalizeMaintenanceText([])).toBeNull();
    expect(normalizeMaintenanceText(true)).toBeNull();
  });
});

describe("resolveMaintenanceLaunch", () => {
  const TZ = "America/Detroit";
  // Pinned so year suppression (and therefore every expected string) can't
  // drift as the wall calendar moves past 2026.
  const opts = { referenceDate: new Date("2026-09-14T12:00:00Z") };

  it("formats a same-day window in the business time zone", () => {
    expect(
      resolveMaintenanceLaunch(
        new Date("2026-09-26T16:00:00Z"),
        new Date("2026-09-26T23:00:00Z"),
        TZ,
        opts,
      ),
    ).toEqual({
      startAt: "2026-09-26T16:00:00.000Z",
      endAt: "2026-09-26T23:00:00.000Z",
      dateText: "Sat, Sep 26",
      timeText: "12:00 – 7:00 PM",
      dateTimeAttr: "2026-09-26T16:00:00.000Z",
    });
  });

  it("accepts ISO strings as well as Dates", () => {
    expect(
      resolveMaintenanceLaunch(
        "2026-09-26T16:00:00Z",
        "2026-09-26T23:00:00Z",
        TZ,
        opts,
      ),
    ).toEqual({
      startAt: "2026-09-26T16:00:00.000Z",
      endAt: "2026-09-26T23:00:00.000Z",
      dateText: "Sat, Sep 26",
      timeText: "12:00 – 7:00 PM",
      dateTimeAttr: "2026-09-26T16:00:00.000Z",
    });
  });

  it("renders a single time when there is no end", () => {
    expect(
      resolveMaintenanceLaunch(
        new Date("2026-09-26T16:00:00Z"),
        null,
        TZ,
        opts,
      ),
    ).toEqual({
      startAt: "2026-09-26T16:00:00.000Z",
      endAt: null,
      dateText: "Sat, Sep 26",
      timeText: "12:00 PM",
      dateTimeAttr: "2026-09-26T16:00:00.000Z",
    });
  });

  it("treats undefined endAt the same as null", () => {
    expect(
      resolveMaintenanceLaunch(
        new Date("2026-09-26T16:00:00Z"),
        undefined,
        TZ,
        opts,
      )?.timeText,
    ).toBe("12:00 PM");
  });

  it("drops an end that is before the start", () => {
    expect(
      resolveMaintenanceLaunch(
        new Date("2026-09-26T16:00:00Z"),
        new Date("2026-09-26T15:00:00Z"),
        TZ,
        opts,
      ),
    ).toEqual({
      startAt: "2026-09-26T16:00:00.000Z",
      endAt: null,
      dateText: "Sat, Sep 26",
      timeText: "12:00 PM",
      dateTimeAttr: "2026-09-26T16:00:00.000Z",
    });
  });

  it("drops an end equal to the start (not strictly after)", () => {
    expect(
      resolveMaintenanceLaunch(
        new Date("2026-09-26T16:00:00Z"),
        new Date("2026-09-26T16:00:00Z"),
        TZ,
        opts,
      )?.endAt,
    ).toBeNull();
  });

  it("drops an unparseable end without losing the start", () => {
    expect(
      resolveMaintenanceLaunch(
        new Date("2026-09-26T16:00:00Z"),
        "garbage",
        TZ,
        opts,
      ),
    ).toEqual({
      startAt: "2026-09-26T16:00:00.000Z",
      endAt: null,
      dateText: "Sat, Sep 26",
      timeText: "12:00 PM",
      dateTimeAttr: "2026-09-26T16:00:00.000Z",
    });
  });

  it("returns null when there is no start", () => {
    expect(resolveMaintenanceLaunch(null, null, TZ, opts)).toBeNull();
    expect(resolveMaintenanceLaunch(undefined, null, TZ, opts)).toBeNull();
  });

  it("returns null for an unparseable start", () => {
    expect(resolveMaintenanceLaunch("garbage", null, TZ, opts)).toBeNull();
    expect(
      resolveMaintenanceLaunch(new Date("garbage"), null, TZ, opts),
    ).toBeNull();
  });

  it("spells out the year when the launch is not in the reference year", () => {
    expect(
      resolveMaintenanceLaunch("2027-09-26T16:00:00Z", null, TZ, opts)
        ?.dateText,
    ).toBe("Sun, Sep 26, 2027");
  });
});
