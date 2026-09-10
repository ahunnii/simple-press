import { describe, expect, it } from "vitest";

import {
  cashAppUrl,
  donationNote,
  normalizeVenmoHandle,
  normalizeCashAppHandle,
  resolveDonationHandles,
  venmoUrl,
} from "./donation-handles";

describe("venmoUrl", () => {
  it("builds the exact Venmo payment-intent URL with encoded note", () => {
    const url = venmoUrl("janedoe", "Donation to Dreamwalker Studios");
    expect(url).toBe(
      "https://venmo.com/janedoe?txn=pay&note=Donation%20to%20Dreamwalker%20Studios",
    );
  });

  it("always includes txn=pay in the query string", () => {
    const url = venmoUrl("handle123", "Some note");
    expect(url).toContain("txn=pay");
  });

  it("never includes amount= in the URL (payment-intent link only)", () => {
    const url = venmoUrl("handle123", "Some note");
    expect(url).not.toContain("amount=");
  });

  it("percent-encodes the note so special characters don't break the query string", () => {
    const testCases: Array<[string, string]> = [
      // Ampersand must be encoded so it doesn't split into another param
      ["Handle & More", "Handle%20%26%20More"],
      // Hash must be encoded so it doesn't become a fragment
      ["#hashtag", "%23hashtag"],
      // Unicode characters must be percent-encoded
      ["café", "caf%C3%A9"],
      // Spaces are encoded as %20 (not +, which some Venmo clients display literally)
      ["Hello World", "Hello%20World"],
    ];

    for (const [noteText, expectedEncoding] of testCases) {
      const url = venmoUrl("handle", noteText);
      expect(url).toContain(`note=${expectedEncoding}`);
    }
  });

  it("includes the handle directly in the path, not under /u/", () => {
    const url = venmoUrl("janedoe", "note");
    expect(url).toContain("venmo.com/janedoe?");
    expect(url).not.toContain("/u/");
  });
});

describe("cashAppUrl", () => {
  it("builds the Cash App cashtag URL with $ prefix", () => {
    const url = cashAppUrl("janedoe");
    expect(url).toBe("https://cash.app/$janedoe");
  });

  it("includes the cashtag with a leading $", () => {
    const url = cashAppUrl("someuser");
    expect(url).toContain("$someuser");
  });
});

describe("donationNote", () => {
  it("returns the exact donation note format", () => {
    expect(donationNote("Dreamwalker Studios")).toBe(
      "Donation to Dreamwalker Studios",
    );
  });

  it("interpolates the business name directly", () => {
    expect(donationNote("Bloom Florist")).toBe("Donation to Bloom Florist");
    expect(donationNote("Riverside Coffee")).toBe("Donation to Riverside Coffee");
  });
});

describe("normalizeVenmoHandle", () => {
  it("returns null for null input", () => {
    expect(normalizeVenmoHandle(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeVenmoHandle(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeVenmoHandle("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(normalizeVenmoHandle("   ")).toBeNull();
    expect(normalizeVenmoHandle("\t\n")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeVenmoHandle("  janedoe  ")).toBe("janedoe");
    expect(normalizeVenmoHandle("\t\nhandle\n\t")).toBe("handle");
  });

  it("strips a single leading @ if present", () => {
    expect(normalizeVenmoHandle("@janedoe")).toBe("janedoe");
    expect(normalizeVenmoHandle("  @handle  ")).toBe("handle");
  });

  it("does NOT strip multiple leading @ symbols (only the first)", () => {
    // This tests that replace(/^@/, "") only strips ONE leading @
    expect(normalizeVenmoHandle("@@double")).toBe("@double");
  });

  it("does NOT strip @ if it's not at the start (after trim)", () => {
    expect(normalizeVenmoHandle("jane@doe")).toBe("jane@doe");
  });

  it("returns the normalized handle when all conditions are met", () => {
    expect(normalizeVenmoHandle("@janedoe")).toBe("janedoe");
    expect(normalizeVenmoHandle("janedoe")).toBe("janedoe");
  });
});

describe("normalizeCashAppHandle", () => {
  it("returns null for null input", () => {
    expect(normalizeCashAppHandle(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeCashAppHandle(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeCashAppHandle("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(normalizeCashAppHandle("   ")).toBeNull();
    expect(normalizeCashAppHandle("\t\n")).toBeNull();
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeCashAppHandle("  janedoe  ")).toBe("janedoe");
    expect(normalizeCashAppHandle("\t\nhandle\n\t")).toBe("handle");
  });

  it("strips a single leading $ if present", () => {
    expect(normalizeCashAppHandle("$janedoe")).toBe("janedoe");
    expect(normalizeCashAppHandle("  $handle  ")).toBe("handle");
  });

  it("does NOT strip multiple leading $ symbols (only the first)", () => {
    // This tests that replace(/^\$/, "") only strips ONE leading $
    expect(normalizeCashAppHandle("$$double")).toBe("$double");
  });

  it("does NOT strip $ if it's not at the start (after trim)", () => {
    expect(normalizeCashAppHandle("jane$doe")).toBe("jane$doe");
  });

  it("returns the normalized handle when all conditions are met", () => {
    expect(normalizeCashAppHandle("$janedoe")).toBe("janedoe");
    expect(normalizeCashAppHandle("janedoe")).toBe("janedoe");
  });
});

describe("resolveDonationHandles", () => {
  describe("both handles set", () => {
    it("returns an array with Venmo first, then Cash App", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "janedoe",
        cashAppHandle: "janedoe",
      });

      expect(resolved).toHaveLength(2);
      expect(resolved[0]?.key).toBe("venmo");
      expect(resolved[1]?.key).toBe("cashapp");
    });

    it("sets displayHandle to @handle for Venmo", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "janedoe",
        cashAppHandle: "ignored",
      });

      const venmo = resolved.find((h) => h.key === "venmo");
      expect(venmo?.displayHandle).toBe("@janedoe");
    });

    it("sets displayHandle to $cashtag for Cash App", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "ignored",
        cashAppHandle: "janedoe",
      });

      const cashapp = resolved.find((h) => h.key === "cashapp");
      expect(cashapp?.displayHandle).toBe("$janedoe");
    });

    it("sets the Venmo URL to the payment-intent link with donation note", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "janedoe",
        cashAppHandle: "ignored",
      });

      const venmo = resolved.find((h) => h.key === "venmo");
      expect(venmo?.url).toBe(
        "https://venmo.com/janedoe?txn=pay&note=Donation%20to%20Bloom%20Florist",
      );
      expect(venmo?.url).toContain("txn=pay");
      expect(venmo?.url).not.toContain("amount=");
    });

    it("sets the Cash App URL to the standard cashtag link format", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "ignored",
        cashAppHandle: "janedoe",
      });

      const cashapp = resolved.find((h) => h.key === "cashapp");
      expect(cashapp?.url).toBe("https://cash.app/$janedoe");
    });

    it("sets the label to 'Venmo' and 'Cash App'", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "venmo_user",
        cashAppHandle: "cashapp_user",
      });

      expect(resolved[0]?.label).toBe("Venmo");
      expect(resolved[1]?.label).toBe("Cash App");
    });

    it("normalizes handles with leading symbols and whitespace", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "  @janedoe  ",
        cashAppHandle: "  $cashuser  ",
      });

      expect(resolved[0]?.displayHandle).toBe("@janedoe");
      expect(resolved[1]?.displayHandle).toBe("$cashuser");
      expect(resolved[0]?.url).toContain("/janedoe");
      expect(resolved[1]?.url).toContain("$cashuser");
    });

    it("produces the full resolved handle object with all fields", () => {
      const resolved = resolveDonationHandles({
        name: "Test Business",
        venmoHandle: "user123",
        cashAppHandle: "user123",
      });

      const venmo = resolved[0];
      expect(venmo).toEqual({
        key: "venmo",
        label: "Venmo",
        displayHandle: "@user123",
        url: "https://venmo.com/user123?txn=pay&note=Donation%20to%20Test%20Business",
      });

      const cashapp = resolved[1];
      expect(cashapp).toEqual({
        key: "cashapp",
        label: "Cash App",
        displayHandle: "$user123",
        url: "https://cash.app/$user123",
      });
    });
  });

  describe("only one handle set", () => {
    it("returns a single-entry array when only Venmo is set", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "janedoe",
        cashAppHandle: null,
      });

      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.key).toBe("venmo");
    });

    it("returns a single-entry array when only Cash App is set", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: null,
        cashAppHandle: "janedoe",
      });

      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.key).toBe("cashapp");
    });

    it("omits the handle lane entirely when it's null", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "user123",
        cashAppHandle: null,
      });

      expect(resolved.every((h) => h.key !== "cashapp")).toBe(true);
    });

    it("omits the handle lane entirely when it normalizes to null (whitespace-only)", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "user123",
        cashAppHandle: "   ",
      });

      expect(resolved).toHaveLength(1);
      expect(resolved[0]?.key).toBe("venmo");
    });
  });

  describe("no handles set", () => {
    it("returns an empty array when both are null", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: null,
        cashAppHandle: null,
      });

      expect(resolved).toEqual([]);
    });

    it("returns an empty array when both normalize to null (whitespace-only)", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "   ",
        cashAppHandle: "\t",
      });

      expect(resolved).toEqual([]);
    });

    it("returns an empty array when both are empty strings", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "",
        cashAppHandle: "",
      });

      expect(resolved).toEqual([]);
    });
  });

  describe("normalization in resolveDonationHandles", () => {
    it("normalizes Venmo handle with leading @", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "@janedoe",
        cashAppHandle: null,
      });

      const venmo = resolved[0];
      expect(venmo?.displayHandle).toBe("@janedoe");
      expect(venmo?.url).toContain("/janedoe");
    });

    it("normalizes Cash App handle with leading $", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: null,
        cashAppHandle: "$janedoe",
      });

      const cashapp = resolved[0];
      expect(cashapp?.displayHandle).toBe("$janedoe");
      expect(cashapp?.url).toContain("$janedoe");
    });

    it("normalizes handles with surrounding whitespace", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "  @user  ",
        cashAppHandle: "  $user  ",
      });

      expect(resolved[0]?.displayHandle).toBe("@user");
      expect(resolved[1]?.displayHandle).toBe("$user");
    });

    it("leaves clean handles untouched", () => {
      const resolved = resolveDonationHandles({
        name: "Bloom Florist",
        venmoHandle: "janedoe",
        cashAppHandle: "janedoe",
      });

      expect(resolved[0]?.displayHandle).toBe("@janedoe");
      expect(resolved[1]?.displayHandle).toBe("$janedoe");
    });
  });

  describe("uses business name in the Venmo URL note", () => {
    it("includes the business name in the donation note of the Venmo URL", () => {
      const resolved = resolveDonationHandles({
        name: "Dreamwalker Studios",
        venmoHandle: "user",
        cashAppHandle: null,
      });

      const venmo = resolved[0];
      expect(venmo?.url).toContain("Donation%20to%20Dreamwalker%20Studios");
    });

    it("handles business names with special characters in the Venmo note", () => {
      const resolved = resolveDonationHandles({
        name: "A&B Coffee",
        venmoHandle: "user",
        cashAppHandle: null,
      });

      const venmo = resolved[0];
      // The note should encode the & as %26 so it doesn't break the URL
      expect(venmo?.url).toContain("%26");
    });
  });
});
