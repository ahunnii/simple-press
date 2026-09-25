import { describe, expect, it } from "vitest";

import type { InvoicePaymentMethod } from "~/lib/validators/invoice";

import {
  buildPaymentInstructions,
  maskAccountNumber,
  parsePaymentInstructions,
  parsePaymentMethods,
  paymentMethodDetailSummary,
  paymentMethodDisplayName,
  paymentMethodSummaryLabels,
  serializePaymentInstructions,
  serializePaymentMethods,
} from "./payment-methods";

const bank: InvoicePaymentMethod = {
  id: "m_bank",
  type: "bank_transfer",
  label: "Business checking",
  accountName: "Acme LLC",
  bankName: "Chase",
  routingNumber: "021000021",
  accountNumber: "000123456789",
  accountType: "checking",
};
const venmo: InvoicePaymentMethod = {
  id: "m_venmo",
  type: "venmo",
  handle: "acme-co",
};
const cashApp: InvoicePaymentMethod = {
  id: "m_cash",
  type: "cash_app",
  cashtag: "acme",
};
const paypal: InvoicePaymentMethod = {
  id: "m_pp",
  type: "paypal",
  handle: "acmeco",
  email: "pay@acme.test",
};
const zelle: InvoicePaymentMethod = {
  id: "m_zelle",
  type: "zelle",
  emailOrPhone: "pay@acme.test",
  name: "Acme LLC",
};
const check: InvoicePaymentMethod = {
  id: "m_check",
  type: "cash_check",
  payableTo: "Acme LLC",
  mailingAddress: "1 Main St, Detroit, MI 48201",
};
const other: InvoicePaymentMethod = {
  id: "m_other",
  type: "other",
  title: "Wire (international)",
  instructions: "Email us for wire details.",
};
const all = [bank, venmo, cashApp, paypal, zelle, check, other];

const ctx = { businessName: "Acme", displayNumber: "INV-0012" };

describe("parsePaymentMethods / serializePaymentMethods", () => {
  it("round-trips a valid list", () => {
    expect(parsePaymentMethods(serializePaymentMethods(all))).toEqual(all);
  });

  it("returns [] for missing or unreadable JSON", () => {
    expect(parsePaymentMethods(null)).toEqual([]);
    expect(parsePaymentMethods("")).toEqual([]);
    expect(parsePaymentMethods("not json")).toEqual([]);
    expect(parsePaymentMethods('{"id":"x"}')).toEqual([]);
  });

  it("drops invalid entries and keeps the rest", () => {
    const json = JSON.stringify([
      bank,
      { id: "m_bad", type: "bank_transfer", accountName: "x" }, // missing fields
      { id: "m_unknown", type: "bitcoin" },
      null,
      venmo,
    ]);
    expect(parsePaymentMethods(json)).toEqual([bank, venmo]);
  });
});

describe("maskAccountNumber", () => {
  it("shows only the last four behind a fixed mask", () => {
    expect(maskAccountNumber("000123456789")).toBe("••••6789");
    expect(maskAccountNumber("1234 5678")).toBe("••••5678");
  });

  it("masks short values entirely", () => {
    expect(maskAccountNumber("1234")).toBe("••••");
    expect(maskAccountNumber("")).toBe("••••");
  });
});

describe("paymentMethodDisplayName", () => {
  it("prefers the owner label, then other's title, then the type label", () => {
    expect(paymentMethodDisplayName(bank)).toBe("Business checking");
    expect(paymentMethodDisplayName(other)).toBe("Wire (international)");
    expect(paymentMethodDisplayName(venmo)).toBe("Venmo");
    expect(paymentMethodDisplayName(check)).toBe("Cash or check");
  });

  it("never includes sensitive details", () => {
    const names = all.map(paymentMethodDisplayName).join(" ");
    expect(names).not.toContain("021000021");
    expect(names).not.toContain("6789");
    expect(names).not.toContain("acme-co");
  });
});

describe("paymentMethodDetailSummary", () => {
  it("masks bank accounts and shows handles", () => {
    expect(paymentMethodDetailSummary(bank)).toBe("Chase ••••6789");
    expect(paymentMethodDetailSummary(venmo)).toBe("@acme-co");
    expect(paymentMethodDetailSummary(cashApp)).toBe("$acme");
    expect(paymentMethodDetailSummary(paypal)).toBe("paypal.me/acmeco");
  });
});

describe("paymentMethodSummaryLabels", () => {
  it("lists selected methods in settings order, skipping unknown ids", () => {
    expect(
      paymentMethodSummaryLabels(all, ["m_zelle", "gone", "m_bank"]),
    ).toEqual(["Business checking", "Zelle"]);
  });
});

describe("buildPaymentInstructions", () => {
  it("renders only selected methods, in settings order", () => {
    const result = buildPaymentInstructions(all, ["m_venmo", "m_bank"], ctx);
    expect(result.map((i) => i.methodId)).toEqual(["m_bank", "m_venmo"]);
  });

  it("skips ids with no matching method", () => {
    expect(buildPaymentInstructions(all, ["deleted"], ctx)).toEqual([]);
  });

  it("lays out bank details with copyable numbers and the reference", () => {
    const [instruction] = buildPaymentInstructions(all, ["m_bank"], ctx);
    expect(instruction).toEqual({
      methodId: "m_bank",
      type: "bank_transfer",
      label: "Business checking",
      lines: [
        { label: "Account name", value: "Acme LLC", copyable: false },
        { label: "Bank", value: "Chase", copyable: false },
        { label: "Routing number", value: "021000021", copyable: true },
        { label: "Account number", value: "000123456789", copyable: true },
        { label: "Account type", value: "Checking", copyable: false },
        { label: "Reference", value: "INV-0012", copyable: true },
      ],
    });
    expect(instruction).not.toHaveProperty("url");
  });

  it("links Venmo with a prefilled note and Cash App to the cashtag", () => {
    const [v, c] = buildPaymentInstructions(all, ["m_venmo", "m_cash"], ctx);
    expect(v?.url).toBe(
      `https://venmo.com/acme-co?txn=pay&note=${encodeURIComponent("Acme invoice INV-0012")}`,
    );
    expect(v?.lines[0]).toEqual({
      label: "Venmo",
      value: "@acme-co",
      copyable: true,
    });
    expect(c?.url).toBe("https://cash.app/$acme");
  });

  it("links PayPal via paypal.me only when there is a handle", () => {
    const [withHandle] = buildPaymentInstructions(all, ["m_pp"], ctx);
    expect(withHandle?.url).toBe("https://paypal.me/acmeco");
    const emailOnly: InvoicePaymentMethod = {
      id: "m_pp2",
      type: "paypal",
      email: "pay@acme.test",
    };
    const [noHandle] = buildPaymentInstructions([emailOnly], ["m_pp2"], ctx);
    expect(noHandle?.url).toBeUndefined();
    expect(noHandle?.lines[0]).toEqual({
      label: "PayPal email",
      value: "pay@acme.test",
      copyable: true,
    });
  });

  it("ends every instruction with the reference line", () => {
    for (const instruction of buildPaymentInstructions(
      all,
      all.map((m) => m.id),
      ctx,
    )) {
      expect(instruction.lines.at(-1)).toEqual({
        label: "Reference",
        value: "INV-0012",
        copyable: true,
      });
    }
  });

  it("omits empty optional lines", () => {
    const [c] = buildPaymentInstructions(
      [{ id: "c", type: "cash_check", payableTo: "Acme" }],
      ["c"],
      ctx,
    );
    expect(c?.lines.map((l) => l.label)).toEqual([
      "Make checks payable to",
      "Reference",
    ]);
  });
});

describe("parsePaymentInstructions / serializePaymentInstructions", () => {
  it("round-trips built instructions", () => {
    const built = buildPaymentInstructions(
      all,
      all.map((m) => m.id),
      ctx,
    );
    expect(
      parsePaymentInstructions(serializePaymentInstructions(built)),
    ).toEqual(built);
  });

  it("is tolerant: bad JSON → [], bad entries dropped", () => {
    expect(parsePaymentInstructions(null)).toEqual([]);
    expect(parsePaymentInstructions("nope")).toEqual([]);
    const good = buildPaymentInstructions(all, ["m_zelle"], ctx);
    const json = JSON.stringify([
      ...good,
      { methodId: "x", type: "zelle", label: "Z", lines: "nope" },
      // A non-https link must never reach an <a href>.
      {
        methodId: "y",
        type: "other",
        label: "Evil",
        lines: [],
        url: "javascript:alert(1)",
      },
    ]);
    expect(parsePaymentInstructions(json)).toEqual(good);
  });
});
