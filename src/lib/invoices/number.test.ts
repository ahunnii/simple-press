import { describe, expect, it } from "vitest";

import { formatInvoiceNumber, parseInvoiceNumberQuery } from "./number";

describe("formatInvoiceNumber", () => {
  it("pads to the configured width", () => {
    expect(formatInvoiceNumber("INV-", 12, 4)).toBe("INV-0012");
    expect(formatInvoiceNumber("", 7, 3)).toBe("007");
    expect(formatInvoiceNumber("#", 1, 1)).toBe("#1");
  });

  it("never truncates a number wider than the padding", () => {
    expect(formatInvoiceNumber("INV-", 12345, 4)).toBe("INV-12345");
  });
});

describe("parseInvoiceNumberQuery", () => {
  it.each([
    ["INV-0012", 12],
    ["inv-12", 12],
    ["#12", 12],
    ["12", 12],
    ["  0012  ", 12],
    ["2026-0012", 12],
    ["ACME/0042", 42],
    ["INV12", 12],
  ])("%j → %d", (query, expected) => {
    expect(parseInvoiceNumberQuery(query)).toBe(expected);
  });

  it.each([
    "",
    "jane",
    "jane doe 12",
    "INV-",
    "12abc",
    "0",
    "INV-0000",
    "99999999999", // beyond Int4
    "a-very-long-prefix-indeed-12",
  ])("%j → null", (query) => {
    expect(parseInvoiceNumberQuery(query)).toBeNull();
  });
});
