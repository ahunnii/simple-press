import { describe, expect, it } from "vitest";

import { loadZipDataset, lookupZip } from "./zip-lookup";

// `zip-lookup.ts` imports "server-only" — vitest.config.ts aliases that
// package to an empty stub module (tests/helpers/empty-module.ts) for the
// whole "unit" project, so no per-file mock is needed here.

describe("lookupZip", () => {
  it("resolves a known zip to its city/state/centroid", async () => {
    const entry = await lookupZip("48601");
    expect(entry).not.toBeNull();
    expect(entry?.city).toBe("Saginaw");
    expect(entry?.state).toBe("MI");
    // Saginaw, MI is roughly 43.4N, 83.9W — sanity-range rather than an
    // exact-value assertion since the upstream GeoNames dump can shift
    // slightly between regenerations.
    expect(entry?.lat).toBeGreaterThan(43);
    expect(entry?.lat).toBeLessThan(44);
    expect(entry?.lng).toBeGreaterThan(-85);
    expect(entry?.lng).toBeLessThan(-83);
  });

  it("returns null for malformed input", async () => {
    await expect(lookupZip("1234")).resolves.toBeNull(); // too short
    await expect(lookupZip("123456")).resolves.toBeNull(); // too long
    await expect(lookupZip("abcde")).resolves.toBeNull(); // non-numeric
    await expect(lookupZip("")).resolves.toBeNull(); // empty
  });

  it("returns null for a well-formed but unknown zip", async () => {
    // "00000" is not a real/assigned US postal code and is absent from the
    // GeoNames dataset.
    await expect(lookupZip("00000")).resolves.toBeNull();
  });
});

describe("loadZipDataset", () => {
  it("memoizes the parsed dataset across calls (same Map instance)", async () => {
    const first = await loadZipDataset();
    const second = await loadZipDataset();
    expect(second).toBe(first);
  });
});
