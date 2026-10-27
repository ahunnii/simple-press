import { describe, expect, it } from "vitest";

import {
  CONTACT_IMPORT_MAX_ROWS,
  ContactCsvError,
  mapContactStatus,
  parseContactCsv,
} from "./contact-import";

describe("parseContactCsv - header detection", () => {
  it("reads a Wix-shaped export and flags it WIX", () => {
    const csv = [
      "First Name,Last Name,Email 1,Phone 1,Email subscriber status",
      "Jane,Doe,Jane@Example.com,555,Subscribed",
      "Sam,Lee,sam@example.com,,Unsubscribed",
      "Pat,Kim,pat@example.com,,Never subscribed",
    ].join("\n");
    const parsed = parseContactCsv(csv);
    expect(parsed.sourceKind).toBe("WIX");
    expect(parsed.columns).toMatchObject({
      email: "Email 1",
      firstName: "First Name",
      lastName: "Last Name",
      status: "Email subscriber status",
    });
    expect(parsed.rows.map((r) => [r.email, r.status])).toEqual([
      ["jane@example.com", "subscribed"],
      ["sam@example.com", "unsubscribed"],
      ["pat@example.com", "unknown"],
    ]);
    expect(parsed.counts).toMatchObject({
      totalRows: 3,
      valid: 3,
      subscribed: 1,
      unsubscribed: 1,
      unknown: 1,
    });
  });

  it("reads generic headers (case/space/punctuation-insensitive) as CSV", () => {
    const csv = [
      "E-mail,first_name,LAST NAME,Accepts Marketing",
      "a@example.com,Ann,Ray,yes",
    ].join("\n");
    const parsed = parseContactCsv(csv);
    expect(parsed.sourceKind).toBe("CSV");
    expect(parsed.columns.email).toBe("E-mail");
    expect(parsed.rows[0]).toMatchObject({
      firstName: "Ann",
      lastName: "Ray",
      status: "subscribed",
    });
  });

  it.each(["Email", "Email Address", "email"])(
    "detects %s as the email",
    (h) => {
      const parsed = parseContactCsv(`${h}\nx@example.com`);
      expect(parsed.columns.email).toBe(h);
      expect(parsed.rows).toHaveLength(1);
    },
  );

  it("splits a single Name column on the first space", () => {
    const parsed = parseContactCsv(
      "Full Name,Email\nMary Ann Smith,m@example.com\nCher,c@example.com",
    );
    expect(parsed.rows[0]).toMatchObject({
      firstName: "Mary",
      lastName: "Ann Smith",
    });
    expect(parsed.rows[1]).toMatchObject({ firstName: "Cher", lastName: null });
  });

  it("ignores the Name column when first/last exist", () => {
    const parsed = parseContactCsv(
      "Name,First Name,Last Name,Email\nIgnored Person,Real,Name,r@example.com",
    );
    expect(parsed.rows[0]).toMatchObject({
      firstName: "Real",
      lastName: "Name",
    });
  });

  it("lets an explicit column map override detection", () => {
    const csv = "Contact,Mail,Opted\nZed,z@example.com,no";
    const auto = parseContactCsv(csv);
    expect(auto.columns.email).toBeNull();
    expect(auto.rows).toEqual([]);

    const mapped = parseContactCsv(csv, {
      email: "mail",
      firstName: "Contact",
      status: "Opted",
    });
    expect(mapped.rows[0]).toMatchObject({
      email: "z@example.com",
      firstName: "Zed",
      status: "unsubscribed",
    });
  });

  it("rejects a column map naming a missing column", () => {
    expect(() =>
      parseContactCsv("Email\na@example.com", { email: "Nope" }),
    ).toThrow(ContactCsvError);
  });

  it("null in the column map turns a detected column off", () => {
    const parsed = parseContactCsv("Email,Status\na@example.com,subscribed", {
      email: "Email",
      status: null,
    });
    expect(parsed.hasStatusColumn).toBe(false);
    expect(parsed.rows[0]!.status).toBe("unknown");
  });

  it("strips a UTF-8 BOM", () => {
    const parsed = parseContactCsv("﻿Email\na@example.com");
    expect(parsed.columns.email).toBe("Email");
  });
});

describe("mapContactStatus", () => {
  it.each([
    ["Subscribed", "subscribed"],
    [" YES ", "subscribed"],
    ["true", "subscribed"],
    ["Opted in", "subscribed"],
    ["1", "subscribed"],
    ["Unsubscribed", "unsubscribed"],
    ["no", "unsubscribed"],
    ["FALSE", "unsubscribed"],
    ["opted out", "unsubscribed"],
    ["0", "unsubscribed"],
    ["Never subscribed", "unknown"],
    ["Not set", "unknown"],
    ["Pending", "unknown"],
    ["", "unknown"],
    ["something else", "unknown"],
  ] as const)("%j -> %s", (raw, expected) => {
    expect(mapContactStatus(raw)).toBe(expected);
  });
});

describe("parseContactCsv - status column absent", () => {
  it("makes every row unknown so nobody is invite-eligible", () => {
    const parsed = parseContactCsv(
      "Email,Name\na@example.com,A\nb@example.com,B",
    );
    expect(parsed.hasStatusColumn).toBe(false);
    expect(parsed.rows.every((r) => r.status === "unknown")).toBe(true);
    expect(parsed.counts).toMatchObject({ subscribed: 0, unknown: 2 });
  });
});

describe("parseContactCsv - dedupe and invalid rows", () => {
  it("dedupes within the file; first occurrence wins", () => {
    const parsed = parseContactCsv(
      [
        "Email,First Name,Status",
        "dup@example.com,First,subscribed",
        "DUP@example.com ,Second,subscribed",
      ].join("\n"),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({ firstName: "First", row: 1 });
    expect(parsed.counts).toMatchObject({
      totalRows: 2,
      valid: 1,
      duplicatesInFile: 1,
    });
  });

  it("makes the merged row unsubscribed when any duplicate is", () => {
    const parsed = parseContactCsv(
      [
        "Email,Status",
        "dup@example.com,subscribed",
        "dup@example.com,unsubscribed",
        "dup@example.com,subscribed",
      ].join("\n"),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]!.status).toBe("unsubscribed");
    expect(parsed.counts).toMatchObject({
      subscribed: 0,
      unsubscribed: 1,
      duplicatesInFile: 2,
    });
  });

  it("collects missing and invalid emails as row errors", () => {
    const parsed = parseContactCsv(
      [
        "Email,Status",
        ",subscribed",
        "not-an-email,subscribed",
        "ok@example.com,subscribed",
      ].join("\n"),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.counts.invalid).toBe(2);
    expect(parsed.errors).toEqual([
      { row: 1, message: "Missing email" },
      { row: 2, message: "Invalid email: not-an-email" },
    ]);
  });

  it("trims and caps names", () => {
    const long = "x".repeat(300);
    const parsed = parseContactCsv(
      `Email,First Name\na@example.com,"  ${long}  "`,
    );
    expect(parsed.rows[0]!.firstName).toHaveLength(100);
  });
});

describe("parseContactCsv - row cap", () => {
  it("accepts exactly the cap", () => {
    const rows = Array.from(
      { length: CONTACT_IMPORT_MAX_ROWS },
      (_, i) => `u${i}@example.com`,
    );
    const parsed = parseContactCsv(`Email\n${rows.join("\n")}`);
    expect(parsed.counts.valid).toBe(CONTACT_IMPORT_MAX_ROWS);
  });

  it("rejects one row over with a clear message", () => {
    const rows = Array.from(
      { length: CONTACT_IMPORT_MAX_ROWS + 1 },
      (_, i) => `u${i}@example.com`,
    );
    expect(() => parseContactCsv(`Email\n${rows.join("\n")}`)).toThrow(
      /5,000 per import/,
    );
  });
});

describe("parseContactCsv - other platforms", () => {
  it("reads a Shopify customer export (Accepts Email Marketing yes/no)", () => {
    const parsed = parseContactCsv(
      [
        "First Name,Last Name,Email,Accepts Email Marketing,Accepts SMS Marketing",
        "Ana,Ruiz,ana@example.com,yes,no",
        "Bo,Li,bo@example.com,no,yes",
      ].join("\n"),
    );
    expect(parsed.sourceKind).toBe("SHOPIFY");
    expect(parsed.columns.status).toBe("Accepts Email Marketing");
    expect(parsed.rows.map((r) => r.status)).toEqual([
      "subscribed",
      "unsubscribed",
    ]);
  });

  it("reads Square's Email Unsubscribed the right way round; 'no' is not consent", () => {
    const parsed = parseContactCsv(
      [
        "First Name,Last Name,Email Address,Email Unsubscribed",
        "Ana,Ruiz,ana@example.com,Yes",
        "Bo,Li,bo@example.com,No",
      ].join("\n"),
    );
    expect(parsed.sourceKind).toBe("SQUARE");
    expect(parsed.rows.map((r) => r.status)).toEqual([
      "unsubscribed",
      "unknown",
    ]);
    expect(parsed.counts.subscribed).toBe(0);
  });

  it("keeps a hand-mapped negated column negated", () => {
    const parsed = parseContactCsv(
      "email,Unsubscribed,Other\nana@example.com,yes,yes",
      { email: "email", status: "Unsubscribed" },
    );
    expect(parsed.rows[0]!.status).toBe("unsubscribed");
  });
});

describe("parseContactCsv - whole-file status", () => {
  const list = "Email,First Name\nana@example.com,Ana\nbo@example.com,Bo";

  it("applies to every row when the file has no status column", () => {
    const parsed = parseContactCsv(list, undefined, {
      fileStatus: "subscribed",
    });
    expect(parsed.fileStatus).toBe("subscribed");
    expect(parsed.rows.every((r) => r.status === "subscribed")).toBe(true);
    expect(parsed.counts.subscribed).toBe(2);
  });

  it("can mark a whole unsubscribed-list export", () => {
    const parsed = parseContactCsv(list, undefined, {
      fileStatus: "unsubscribed",
    });
    expect(parsed.counts.unsubscribed).toBe(2);
  });

  it("is refused when the file has a status column", () => {
    expect(() =>
      parseContactCsv(
        "Email,Accepts Email Marketing\nana@example.com,no",
        undefined,
        { fileStatus: "subscribed" },
      ),
    ).toThrow(/its own subscription column/);
  });

  it("works once the status column is mapped to None", () => {
    const parsed = parseContactCsv(
      "Email,Status\nana@example.com,active",
      { email: "Email", status: null },
      { fileStatus: "subscribed" },
    );
    expect(parsed.rows[0]!.status).toBe("subscribed");
  });
});
