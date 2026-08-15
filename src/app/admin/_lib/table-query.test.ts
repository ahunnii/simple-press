import { describe, expect, it } from "vitest";

import {
  ADMIN_BULK_SELECTION_LIMIT,
  MAX_REQUESTED_PAGE,
} from "~/lib/validators/admin-table";

import {
  buildTablePage,
  canonicalPageHref,
  matchesAllTokens,
  parsePageParam,
} from "./table-query";

describe("parsePageParam", () => {
  it("parses a valid page number", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("1")).toBe(1);
  });

  it("returns undefined when the param is absent", () => {
    expect(parsePageParam(undefined)).toBeUndefined();
    expect(parsePageParam("")).toBeUndefined();
  });

  // The bug this function exists for: `Math.max(1, parseInt("abc", 10))` is
  // NaN, and NaN reaches `.int().positive()` as a BAD_REQUEST → error boundary.
  it("returns undefined for a non-numeric page", () => {
    expect(parsePageParam("abc")).toBeUndefined();
    expect(parsePageParam("page-2")).toBeUndefined();
  });

  it("returns undefined for zero and negative pages", () => {
    expect(parsePageParam("0")).toBeUndefined();
    expect(parsePageParam("-5")).toBeUndefined();
  });

  // `parseInt("1e20", 10)` is 1, not 1e20 — the overflow arrives as a long
  // digit string, so both shapes are covered.
  it("clamps an absurd page to MAX_REQUESTED_PAGE", () => {
    expect(parsePageParam("99999999999999999999")).toBe(MAX_REQUESTED_PAGE);
    expect(parsePageParam(String(Number.MAX_SAFE_INTEGER))).toBe(
      MAX_REQUESTED_PAGE,
    );
    expect(parsePageParam("1000001")).toBe(MAX_REQUESTED_PAGE);
    expect(parsePageParam("1e20")).toBe(1);
  });

  it("leaves the cap itself untouched", () => {
    expect(parsePageParam(String(MAX_REQUESTED_PAGE))).toBe(MAX_REQUESTED_PAGE);
  });
});

describe("canonicalPageHref", () => {
  const BASE = "/admin/products";

  it("returns null when the URL already matches the rendered page", () => {
    expect(canonicalPageHref(BASE, {}, 1)).toBeNull();
    expect(canonicalPageHref(BASE, { page: "3" }, 3)).toBeNull();
  });

  it("rewrites the page param when the router clamped it", () => {
    expect(canonicalPageHref(BASE, { page: "900" }, 3)).toBe(`${BASE}?page=3`);
  });

  // Must match AdminPagination's `hrefFor(1)`, which deletes rather than sets.
  it("deletes the page param when the rendered page is 1", () => {
    expect(canonicalPageHref(BASE, { page: "900" }, 1)).toBe(BASE);
    expect(canonicalPageHref(BASE, { page: "1" }, 1)).toBe(BASE);
  });

  it("preserves every other search param", () => {
    expect(
      canonicalPageHref(
        BASE,
        { search: "mug", status: "draft", page: "900" },
        2,
      ),
    ).toBe(`${BASE}?search=mug&status=draft&page=2`);
    expect(canonicalPageHref(BASE, { search: "mug", page: "900" }, 1)).toBe(
      `${BASE}?search=mug`,
    );
  });

  // The redirect target must itself be canonical, or the page redirects forever.
  it("is idempotent", () => {
    const once = canonicalPageHref(BASE, { page: "900" }, 3);
    expect(once).not.toBeNull();
    expect(canonicalPageHref(BASE, { page: "3" }, 3)).toBeNull();
  });

  it("cleans up an unparseable page param", () => {
    expect(canonicalPageHref(BASE, { page: "abc" }, 1)).toBe(BASE);
  });
});

describe("matchesAllTokens", () => {
  // The bug this exists for: "John Smith" against a customer whose email is
  // "john@example.com" and whose lastName is "Smith" — no single field
  // contains the whole string, so a naive `includes` search matches nothing.
  it("matches when tokens are split across different fields", () => {
    expect(
      matchesAllTokens("John Smith", ["john@example.com", "John", "Smith"]),
    ).toBe(true);
  });

  it("is order-insensitive", () => {
    const fields = ["john@example.com", "John", "Smith"];
    expect(matchesAllTokens("smith john", fields)).toBe(true);
    expect(matchesAllTokens("John Smith", fields)).toBe(true);
  });

  it("matches partial tokens", () => {
    expect(matchesAllTokens("jo sm", ["John", "Smith"])).toBe(true);
    expect(matchesAllTokens("jo xy", ["John", "Smith"])).toBe(false);
  });

  it("requires every token to match at least one field", () => {
    // "Smith" has no home among these fields.
    expect(matchesAllTokens("John Smith", ["John", "Doe"])).toBe(false);
  });

  it("treats an empty or whitespace-only query as matching everything", () => {
    expect(matchesAllTokens("", ["John", "Smith"])).toBe(true);
    expect(matchesAllTokens("   ", ["John", "Smith"])).toBe(true);
    expect(matchesAllTokens("", [])).toBe(true);
  });

  it("skips null/undefined fields rather than throwing", () => {
    expect(matchesAllTokens("john", [null, undefined, "John Smith"])).toBe(
      true,
    );
    expect(matchesAllTokens("missing", [null, undefined])).toBe(false);
  });

  // Single-token queries must behave exactly like the old plain-substring
  // check they replace.
  it("behaves like a plain substring match for a single token", () => {
    expect(matchesAllTokens("smith", ["John Smith"])).toBe(true);
    expect(matchesAllTokens("xyz", ["John Smith"])).toBe(false);
  });
});

describe("buildTablePage", () => {
  type Row = { id: string; name: string };

  const rows = (count: number): Row[] =>
    Array.from({ length: count }, (_, i) => ({
      // Padded so `localeCompare` on the id agrees with the numeric order —
      // otherwise "row-10" sorts before "row-2" and the assertions below read
      // as failures of the helper rather than of the fixture.
      id: `row-${String(i).padStart(4, "0")}`,
      name: `Row ${i}`,
    }));

  const byName = (a: Omit<Row, "id">, b: Omit<Row, "id">) =>
    a.name.localeCompare(b.name);

  it("enumerates matchingIds at and below the selection limit", () => {
    const result = buildTablePage(rows(ADMIN_BULK_SELECTION_LIMIT), {
      comparePrimary: byName,
      pageParam: undefined,
      pageSize: 25,
    });

    expect(result.matchingIds).toHaveLength(ADMIN_BULK_SELECTION_LIMIT);
    expect(result.totalCount).toBe(ADMIN_BULK_SELECTION_LIMIT);
  });

  // `null`, never `[]` — an empty array is a genuine "nothing matched", and the
  // bulk bar would offer a "Select all 0" link for it.
  it("withholds matchingIds above the selection limit", () => {
    const result = buildTablePage(rows(ADMIN_BULK_SELECTION_LIMIT + 1), {
      comparePrimary: byName,
      pageParam: undefined,
      pageSize: 25,
    });

    expect(result.matchingIds).toBeNull();
    // The page itself is unaffected — only the escalation is withheld.
    expect(result.pageItems).toHaveLength(25);
    expect(result.totalCount).toBe(ADMIN_BULK_SELECTION_LIMIT + 1);
  });

  it("returns an empty matchingIds array when nothing matches", () => {
    const result = buildTablePage([] as Row[], {
      comparePrimary: byName,
      pageParam: undefined,
      pageSize: 25,
    });

    expect(result.matchingIds).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  it("clamps a page past the end onto the last one", () => {
    const result = buildTablePage(rows(30), {
      comparePrimary: byName,
      pageParam: "900",
      pageSize: 25,
    });

    expect(result.page).toBe(2);
    expect(result.pageItems).toHaveLength(5);
  });

  // The tie-break the helper appends itself: `comparePrimary` returns 0 for
  // every pair here, so without it the input order would survive and pagination
  // could show one row twice.
  it("applies the id tie-break when the primary ordering ties", () => {
    const tied: Row[] = [
      { id: "c", name: "same" },
      { id: "a", name: "same" },
      { id: "b", name: "same" },
    ];
    const result = buildTablePage(tied, {
      comparePrimary: byName,
      pageParam: undefined,
      pageSize: 25,
    });

    expect(result.matchingIds).toEqual(["a", "b", "c"]);
  });
});
