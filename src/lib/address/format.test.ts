import { describe, expect, it } from "vitest";

import { formatBusinessAddress, hasAddressParts } from "./format";

describe("formatBusinessAddress", () => {
  it("joins a full US address", () => {
    expect(
      formatBusinessAddress({
        street: "123 Main St",
        city: "Detroit",
        state: "MI",
        postalCode: "48201",
      }),
    ).toBe("123 Main St, Detroit, MI 48201");
  });

  it("omits missing parts without stray separators", () => {
    expect(formatBusinessAddress({ city: "Detroit", state: "MI" })).toBe(
      "Detroit, MI",
    );
    expect(
      formatBusinessAddress({ street: "123 Main St", postalCode: "48201" }),
    ).toBe("123 Main St, 48201");
    expect(formatBusinessAddress({ street: " 123 Main St " })).toBe(
      "123 Main St",
    );
  });

  it("returns an empty string when everything is blank", () => {
    expect(formatBusinessAddress({})).toBe("");
    expect(formatBusinessAddress({ street: "", city: null, state: "  " })).toBe(
      "",
    );
  });
});

describe("hasAddressParts", () => {
  it("is true when any part is non-blank", () => {
    expect(hasAddressParts({ postalCode: "48201" })).toBe(true);
  });

  it("is false when every part is blank", () => {
    expect(hasAddressParts({ street: "", city: "  ", state: null })).toBe(
      false,
    );
  });
});
