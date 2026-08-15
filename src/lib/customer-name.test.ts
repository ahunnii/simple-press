import { describe, expect, it } from "vitest";

import { splitCustomerName } from "./customer-name";

describe("splitCustomerName", () => {
  it("splits a two-part name", () => {
    expect(splitCustomerName("Ada Lovelace")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("keeps every part after the first as the last name", () => {
    expect(splitCustomerName("Jean Luc Picard")).toEqual({
      firstName: "Jean",
      lastName: "Luc Picard",
    });
  });

  // The whole reason this helper exists. `""` is not NULL: the admin customer
  // list orders on these columns with `nulls: "last"`, which an empty string
  // silently defeats — it sorts before every real name ascending and after
  // every one descending, so a mix of the two spellings puts nameless
  // customers at both ends of the same list.
  it.each([
    ["a mononym", "Cher"],
    ["trailing whitespace", "Cher "],
  ])("returns null, never an empty string, for %s", (_label, input) => {
    const result = splitCustomerName(input);
    expect(result).toEqual({ firstName: "Cher", lastName: null });
    expect(result.lastName).not.toBe("");
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["whitespace only", "   "],
  ])("returns null for both halves given %s", (_label, input) => {
    expect(splitCustomerName(input)).toEqual({
      firstName: null,
      lastName: null,
    });
  });

  it("collapses runs of whitespace rather than leaking them into the last name", () => {
    expect(splitCustomerName("Ada  Lovelace")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("handles tabs and newlines as separators", () => {
    expect(splitCustomerName("Ada\tLovelace")).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });
});
