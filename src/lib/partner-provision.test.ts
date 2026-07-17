import { describe, expect, it } from "vitest";

import {
  buildClaimUrl,
  buildStorefrontUrl,
  extFromContentType,
  isImageContentType,
  provisionRequestSchema,
  resolveTemplateId,
} from "./partner-provision";

describe("extFromContentType", () => {
  it("maps the allow-listed image types to extensions", () => {
    expect(extFromContentType("image/png")).toBe(".png");
    expect(extFromContentType("image/jpeg")).toBe(".jpg");
    expect(extFromContentType("image/jpg")).toBe(".jpg");
    expect(extFromContentType("image/webp")).toBe(".webp");
    expect(extFromContentType("image/svg+xml")).toBe(".svg");
  });

  it("strips parameters and is case-insensitive", () => {
    expect(extFromContentType("image/svg+xml; charset=utf-8")).toBe(".svg");
    expect(extFromContentType("IMAGE/PNG")).toBe(".png");
  });

  it("returns null for unknown or missing types", () => {
    expect(extFromContentType("image/gif")).toBeNull();
    expect(extFromContentType("application/pdf")).toBeNull();
    expect(extFromContentType(null)).toBeNull();
    expect(extFromContentType("")).toBeNull();
  });
});

describe("isImageContentType", () => {
  it("accepts any image/* type", () => {
    expect(isImageContentType("image/png")).toBe(true);
    expect(isImageContentType("image/gif; charset=x")).toBe(true);
    expect(isImageContentType("IMAGE/WEBP")).toBe(true);
  });

  it("rejects non-image or missing types", () => {
    expect(isImageContentType("text/html")).toBe(false);
    expect(isImageContentType(null)).toBe(false);
  });
});

describe("resolveTemplateId", () => {
  const free = ["modern", "default", "elegant"] as const;

  it("defaults to the platform default template when unset", () => {
    expect(resolveTemplateId(undefined, free)).toEqual({
      templateId: "default",
      fellBack: false,
    });
  });

  it("keeps a valid free template", () => {
    expect(resolveTemplateId("elegant", free)).toEqual({
      templateId: "elegant",
      fellBack: false,
    });
  });

  it("falls back to the default template for unknown/paid templates", () => {
    expect(resolveTemplateId("bamboo", free)).toEqual({
      templateId: "default",
      fellBack: true,
    });
  });
});

describe("url builders", () => {
  it("builds a storefront url", () => {
    expect(buildStorefrontUrl("rosas-textiles", "example.com")).toBe(
      "https://rosas-textiles.example.com",
    );
  });

  it("builds a claim url and avoids double slashes", () => {
    expect(buildClaimUrl("https://app.example.com", "abc123")).toBe(
      "https://app.example.com/platform/claim/abc123",
    );
    expect(buildClaimUrl("https://app.example.com/", "abc123")).toBe(
      "https://app.example.com/platform/claim/abc123",
    );
  });
});

describe("provisionRequestSchema", () => {
  const valid = {
    afProvisionCode: "A1B2C3D4",
    businessName: "Rosa's Textiles",
    email: "rosa@example.com",
  };

  it("accepts a minimal valid payload", () => {
    expect(provisionRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional fields", () => {
    const r = provisionRequestSchema.safeParse({
      ...valid,
      phone: "+13135551234",
      logoUrl: "https://af-storage.example/logo.png",
      templateId: "modern",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty afProvisionCode", () => {
    expect(
      provisionRequestSchema.safeParse({ ...valid, afProvisionCode: "" })
        .success,
    ).toBe(false);
  });

  it("rejects a bad email", () => {
    expect(
      provisionRequestSchema.safeParse({ ...valid, email: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("rejects a non-https logoUrl", () => {
    expect(
      provisionRequestSchema.safeParse({
        ...valid,
        logoUrl: "http://af-storage.example/logo.png",
      }).success,
    ).toBe(false);
  });
});
