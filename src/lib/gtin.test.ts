import { describe, expect, it } from "vitest";

import { gtinFieldSchema, isValidGtin, normalizeGtin } from "./gtin";

describe("normalizeGtin", () => {
  it("strips spaces from GTIN", () => {
    expect(normalizeGtin("9638 5074")).toBe("96385074");
  });

  it("strips hyphens from GTIN", () => {
    expect(normalizeGtin("0360-00-291452")).toBe("036000291452");
  });

  it("strips both spaces and hyphens", () => {
    expect(normalizeGtin("4006 381-33-3931")).toBe("4006381333931");
  });

  it("returns the original if no spaces or hyphens", () => {
    expect(normalizeGtin("96385074")).toBe("96385074");
  });
});

describe("isValidGtin", () => {
  describe("valid GTINs", () => {
    it("accepts GTIN-8", () => {
      expect(isValidGtin("96385074")).toBe(true);
    });

    it("accepts UPC-A (12-digit)", () => {
      expect(isValidGtin("036000291452")).toBe(true);
    });

    it("accepts EAN-13", () => {
      expect(isValidGtin("5901234123457")).toBe(true);
      // Odd length: weighting must start from the right, not the left.
      expect(isValidGtin("4006381333931")).toBe(true);
      expect(isValidGtin("4006381333937")).toBe(false);
    });

    it("accepts GTIN-14", () => {
      expect(isValidGtin("00012345600012")).toBe(true);
    });

    it("strips spaces and hyphens before validation", () => {
      expect(isValidGtin("9638 5074")).toBe(true);
      expect(isValidGtin("0360-00-291452")).toBe(true);
    });
  });

  describe("invalid GTINs", () => {
    it("rejects incorrect check digit", () => {
      // Valid: 96385074, invalid: 96385073
      expect(isValidGtin("96385073")).toBe(false);
    });

    it("rejects wrong length", () => {
      expect(isValidGtin("123")).toBe(false);
      expect(isValidGtin("1234567")).toBe(false);
      expect(isValidGtin("123456789")).toBe(false);
      expect(isValidGtin("12345678901")).toBe(false);
      expect(isValidGtin("123456789012345")).toBe(false);
    });

    it("rejects all zeros", () => {
      expect(isValidGtin("00000000")).toBe(false);
      expect(isValidGtin("000000000000")).toBe(false);
      expect(isValidGtin("0000000000000")).toBe(false);
      expect(isValidGtin("00000000000000")).toBe(false);
    });

    it("rejects non-digit characters", () => {
      expect(isValidGtin("9638507a")).toBe(false);
      expect(isValidGtin("ABC12345670")).toBe(false);
      expect(isValidGtin("123456#7890")).toBe(false);
    });

    it("rejects null/undefined", () => {
      expect(isValidGtin(null)).toBe(false);
      expect(isValidGtin(undefined)).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidGtin("")).toBe(false);
    });
  });
});

describe("gtinFieldSchema", () => {
  it("accepts empty string", () => {
    expect(gtinFieldSchema.parse("")).toBeUndefined();
  });

  it("accepts undefined", () => {
    expect(gtinFieldSchema.parse(undefined)).toBeUndefined();
  });

  it("accepts valid GTIN-8", () => {
    expect(gtinFieldSchema.parse("96385074")).toBe("96385074");
  });

  it("accepts valid GTIN-12", () => {
    expect(gtinFieldSchema.parse("036000291452")).toBe("036000291452");
  });

  it("accepts valid GTIN-13", () => {
    expect(gtinFieldSchema.parse("5901234123457")).toBe("5901234123457");
  });

  it("accepts valid GTIN-14", () => {
    expect(gtinFieldSchema.parse("00012345600012")).toBe("00012345600012");
  });

  it("trims whitespace", () => {
    expect(gtinFieldSchema.parse("  96385074  ")).toBe("96385074");
  });

  it("rejects invalid GTIN", () => {
    const result = gtinFieldSchema.safeParse("12345");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("valid");
    }
  });

  it("rejects bad check digit", () => {
    const result = gtinFieldSchema.safeParse("96385073");
    expect(result.success).toBe(false);
  });

  it("rejects all zeros", () => {
    const result = gtinFieldSchema.safeParse("00000000");
    expect(result.success).toBe(false);
  });
});
