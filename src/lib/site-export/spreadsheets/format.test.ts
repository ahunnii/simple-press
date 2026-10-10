import Papa from "papaparse";
import { describe, expect, it } from "vitest";

import {
  centsToMoney,
  CSV_BOM,
  formatBirthday,
  formatCalendarDate,
  formatDateInZone,
  formatDateTime,
  humanize,
  joinParts,
  plainText,
  resolveTimeZone,
  sheetToCsv,
  withBom,
  yesNo,
} from "./format";

describe("centsToMoney", () => {
  it("formats cents as a two-decimal dollar amount", () => {
    expect(centsToMoney(1234)).toBe("12.34");
    expect(centsToMoney(5)).toBe("0.05");
    expect(centsToMoney(0)).toBe("0.00");
    expect(centsToMoney(100000)).toBe("1000.00");
  });

  it("leaves null/undefined/NaN blank", () => {
    expect(centsToMoney(null)).toBe("");
    expect(centsToMoney(undefined)).toBe("");
    expect(centsToMoney(Number.NaN)).toBe("");
  });

  it("rounds fractional cents and never prints -0.00", () => {
    expect(centsToMoney(1999.6)).toBe("20.00");
    expect(centsToMoney(-0.2)).toBe("0.00");
    expect(centsToMoney(-250)).toBe("-2.50");
  });
});

describe("yesNo / humanize / joinParts", () => {
  it("renders booleans as Yes/No", () => {
    expect(yesNo(true)).toBe("Yes");
    expect(yesNo(false)).toBe("No");
    expect(yesNo(null)).toBe("No");
  });

  it("turns snake_case status values into sentences", () => {
    expect(humanize("partially_fulfilled")).toBe("Partially fulfilled");
    expect(humanize("PAID")).toBe("Paid");
    expect(humanize(null)).toBe("");
  });

  it("joins only the non-empty parts", () => {
    expect(joinParts(["a", null, " ", "b"], ", ")).toBe("a, b");
  });
});

describe("dates", () => {
  // 2026-01-05 02:30 UTC = 2026-01-04 21:30 in Detroit (EST, UTC-5).
  const instant = new Date(Date.UTC(2026, 0, 5, 2, 30));

  it("formats an instant as YYYY-MM-DD HH:mm in the business zone", () => {
    expect(formatDateTime(instant, "America/Detroit")).toBe("2026-01-04 21:30");
    expect(formatDateTime(instant, "UTC")).toBe("2026-01-05 02:30");
  });

  it("falls back to UTC for a missing or invalid zone", () => {
    expect(formatDateTime(instant, null)).toBe("2026-01-05 02:30");
    expect(formatDateTime(instant, "Not/AZone")).toBe("2026-01-05 02:30");
    expect(resolveTimeZone("Not/AZone")).toBe("UTC");
    expect(resolveTimeZone("America/Detroit")).toBe("America/Detroit");
  });

  it("uses 00:xx (not 24:xx) at midnight", () => {
    const midnight = new Date(Date.UTC(2026, 6, 1, 4, 5)); // 00:05 Detroit (EDT)
    expect(formatDateTime(midnight, "America/Detroit")).toBe(
      "2026-07-01 00:05",
    );
  });

  it("handles DST and zero-pads", () => {
    const summer = new Date(Date.UTC(2026, 6, 4, 13, 7)); // 09:07 EDT
    expect(formatDateTime(summer, "America/Detroit")).toBe("2026-07-04 09:07");
  });

  it("returns blank for null and invalid dates", () => {
    expect(formatDateTime(null, "UTC")).toBe("");
    expect(formatDateTime(new Date("nope"), "UTC")).toBe("");
  });

  it("formats only the zoned date", () => {
    expect(formatDateInZone(instant, "America/Detroit")).toBe("2026-01-04");
  });

  it("reads stored calendar dates in UTC so they never shift a day", () => {
    const due = new Date(Date.UTC(2026, 2, 1)); // midnight UTC
    expect(formatCalendarDate(due)).toBe("2026-03-01");
    expect(formatCalendarDate(null)).toBe("");
  });

  it("writes a birthday as month name and day", () => {
    expect(formatBirthday(3, 14)).toBe("March 14");
    expect(formatBirthday(null, 14)).toBe("");
    expect(formatBirthday(13, 1)).toBe("");
  });
});

describe("plainText", () => {
  it("strips tags, keeps paragraph breaks, decodes entities", () => {
    expect(plainText("<p>Fish &amp; chips</p><p>Second&nbsp;line</p>")).toBe(
      "Fish & chips\nSecond line",
    );
  });

  it("turns list items into bullets and <br> into line breaks", () => {
    expect(plainText("<ul><li>One</li><li>Two</li></ul>a<br>b")).toBe(
      "• One\n• Two\na\nb",
    );
  });

  it("converts literal backslash-n sequences left by old imports", () => {
    expect(plainText("Line one\\nLine two")).toBe("Line one\nLine two");
  });

  it("collapses runs of blank lines and returns '' for empty input", () => {
    expect(plainText("a\n\n\n\nb")).toBe("a\n\nb");
    expect(plainText(null)).toBe("");
  });

  it("decodes numeric entities", () => {
    expect(plainText("caf&#233; &#x2603;")).toBe("café ☃");
  });
});

describe("sheetToCsv", () => {
  it("starts with a UTF-8 BOM", () => {
    const csv = sheetToCsv({ columns: ["A"], rows: [{ A: "café" }] });
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("emits a header-only file for an empty sheet", () => {
    const csv = sheetToCsv({ columns: ["Email", "Total"], rows: [] });
    expect(csv.trim()).toBe(`${CSV_BOM}"Email","Total"`.trim());
    expect(csv.split(/\r?\n/).filter(Boolean)).toHaveLength(1);
  });

  it("orders cells by column and blanks missing ones", () => {
    const csv = sheetToCsv({
      columns: ["B", "A", "C"],
      rows: [{ A: "1", B: "2" }],
    });
    const parsed = Papa.parse<string[]>(csv.slice(1)).data;
    expect(parsed[0]).toEqual(["B", "A", "C"]);
    expect(parsed[1]).toEqual(["2", "1", ""]);
  });

  it("escapes formula-looking cells (full mode) but not plain numbers", () => {
    const csv = sheetToCsv({
      columns: ["Name", "Phone", "Amount"],
      rows: [
        { Name: '=HYPERLINK("x")', Phone: "+15551234567", Amount: "-5.00" },
      ],
    });
    const row = Papa.parse<string[]>(csv.slice(1)).data[1];
    expect(row?.[0]).toBe('\'=HYPERLINK("x")');
    expect(row?.[1]).toBe("+15551234567");
    expect(row?.[2]).toBe("-5.00");
  });

  it("keeps embedded commas and newlines inside one quoted cell", () => {
    const csv = sheetToCsv({
      columns: ["Note"],
      rows: [{ Note: "line 1\nline 2, still one cell" }],
    });
    const parsed = Papa.parse<string[]>(csv.slice(1)).data;
    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.[0]).toBe("line 1\nline 2, still one cell");
  });
});

describe("withBom", () => {
  it("adds the BOM once", () => {
    expect(withBom("a,b")).toBe(`${CSV_BOM}a,b`);
    expect(withBom(`${CSV_BOM}a,b`)).toBe(`${CSV_BOM}a,b`);
  });
});
