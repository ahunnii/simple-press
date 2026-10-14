import { describe, expect, it } from "vitest";

import type { ShippingAddress } from "./shipping-address";

import { formatAddressForCopy } from "./shipping-address";

const base: ShippingAddress = {
  firstName: "Ada",
  lastName: "Lovelace",
  address1: "12 Analytical Way",
  city: "Ann Arbor",
  province: "MI",
  zip: "48104",
  country: "United States",
};

describe("formatAddressForCopy", () => {
  it("includes company and address2 in order", () => {
    expect(
      formatAddressForCopy({
        ...base,
        company: "Engines Inc",
        address2: "Suite 4",
      }),
    ).toBe(
      [
        "Ada Lovelace",
        "Engines Inc",
        "12 Analytical Way",
        "Suite 4",
        "Ann Arbor, MI 48104",
        "United States",
      ].join("\n"),
    );
  });

  it("drops the comma when there is no province", () => {
    expect(
      formatAddressForCopy({ ...base, province: "", country: "Monaco" }),
    ).toBe(
      ["Ada Lovelace", "12 Analytical Way", "Ann Arbor 48104", "Monaco"].join(
        "\n",
      ),
    );
  });

  it("skips null optional fields", () => {
    expect(
      formatAddressForCopy({
        ...base,
        company: null,
        address2: null,
        province: null,
        phone: null,
      }),
    ).toBe(
      [
        "Ada Lovelace",
        "12 Analytical Way",
        "Ann Arbor 48104",
        "United States",
      ].join("\n"),
    );
  });
});
