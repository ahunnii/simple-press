import { describe, expect, it, vi } from "vitest";

import {
  maintenanceCtaSchema,
  maintenanceMessageSchema,
  normalizeMaintenanceMessage,
  resolveMaintenanceCta,
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
    expect(normalizeMaintenanceMessage({ type: "doc", content: [] })).toBeNull();
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
      ).toEqual({ type: "external", label: "Visit us", href: "https://example.com" });
    });

    it("returns null when the URL is missing", () => {
      expect(
        resolveMaintenanceCta({ type: "external", label: "Visit us" }, business),
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
          { type: "external", label: "Visit us", value: "ftp://example.com/file" },
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
      ).toEqual({ type: "email", label: "Email us", href: "mailto:hello@example.com" });
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
        { type: "paragraph", content: [{ type: "text", text: "We'll be back soon." }] },
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
      maintenanceCtaSchema.safeParse({ type: "call", label: "Call us" }).success,
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
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
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
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
      },
    });

    expect(result).toEqual({
      active: true,
      scope: "business",
      variant: "coming_soon",
      message: wrapPlainTextAsTiptapDoc("back soon!"),
      cta: { type: "external", label: "Follow us", href: "https://example.com" },
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
        phoneNumber: business.phoneNumber,
        supportEmail: business.supportEmail,
      },
    });

    expect(result).toEqual({ active: false });
  });
});
