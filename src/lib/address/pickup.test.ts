import { describe, expect, it } from "vitest";

import { resolvePickupLocation } from "./pickup";

const parts = {
  addressStreet: "123 Main St",
  addressCity: "Detroit",
  addressState: "MI",
  addressPostalCode: "48201",
};

describe("resolvePickupLocation", () => {
  it("prefers the explicit pickup location", () => {
    expect(
      resolvePickupLocation({
        pickupLocation: " Back door, 9 Alley Rd ",
        ...parts,
        businessAddress: "Old line",
      }),
    ).toBe("Back door, 9 Alley Rd");
  });

  it("falls back to the formatted structured address", () => {
    expect(
      resolvePickupLocation({
        pickupLocation: null,
        ...parts,
        businessAddress: "Old line",
      }),
    ).toBe("123 Main St, Detroit, MI 48201");
  });

  it("treats a blank pickup location as unset", () => {
    expect(resolvePickupLocation({ pickupLocation: "  ", ...parts })).toBe(
      "123 Main St, Detroit, MI 48201",
    );
  });

  it("uses partial structured parts", () => {
    expect(
      resolvePickupLocation({ addressCity: "Detroit", addressState: "MI" }),
    ).toBe("Detroit, MI");
  });

  it("falls back to the legacy one-line address", () => {
    expect(
      resolvePickupLocation({ businessAddress: " 5 Legacy Ln, Ann Arbor " }),
    ).toBe("5 Legacy Ln, Ann Arbor");
  });

  it("returns null when nothing is configured", () => {
    expect(
      resolvePickupLocation({ pickupLocation: "", businessAddress: "" }),
    ).toBeNull();
    expect(resolvePickupLocation(null)).toBeNull();
    expect(resolvePickupLocation(undefined)).toBeNull();
  });
});
