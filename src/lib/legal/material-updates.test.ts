import { describe, expect, it } from "vitest";

import type { MaterialPolicyUpdate } from "~/lib/legal/material-updates";
import {
  clickwrapCoversUpdate,
  findMaterialUpdate,
  isPending,
  latestMaterialUpdate,
  MATERIAL_POLICY_UPDATES,
  policyToday,
  validateMaterialUpdates,
} from "~/lib/legal/material-updates";

function update(
  overrides: Partial<MaterialPolicyUpdate> & { id: string },
): MaterialPolicyUpdate {
  return {
    documents: ["merchant"],
    announcedOn: "2027-01-01",
    effectiveOn: "2027-02-01",
    summary: "Something changed.",
    ...overrides,
  };
}

// Noon UTC = 7–8am Eastern, so the Eastern calendar day matches the UTC one.
const at = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

const MERCHANT_JAN = update({
  id: "2027-01-merchant",
  announcedOn: "2027-01-01",
  effectiveOn: "2027-02-01",
});
const PLATFORM_MAR = update({
  id: "2027-03-platform",
  documents: ["platform"],
  announcedOn: "2027-03-01",
  effectiveOn: "2027-04-01",
});
const BOTH_MAY = update({
  id: "2027-05-both",
  documents: ["merchant", "platform"],
  announcedOn: "2027-05-01",
  effectiveOn: "2027-06-15",
});
const UPDATES = [BOTH_MAY, MERCHANT_JAN, PLATFORM_MAR]; // deliberately unordered

describe("MATERIAL_POLICY_UPDATES registry", () => {
  it("is well-formed (unique ids, valid dates, ≥ 30 days' notice)", () => {
    expect(validateMaterialUpdates(MATERIAL_POLICY_UPDATES)).toEqual([]);
  });
});

describe("validateMaterialUpdates", () => {
  it("accepts exactly 30 days of notice", () => {
    expect(
      validateMaterialUpdates([
        update({
          id: "a",
          announcedOn: "2027-01-01",
          effectiveOn: "2027-01-31",
        }),
      ]),
    ).toEqual([]);
  });

  it("rejects less than 30 days of notice", () => {
    expect(
      validateMaterialUpdates([
        update({
          id: "a",
          announcedOn: "2027-01-01",
          effectiveOn: "2027-01-30",
        }),
      ]),
    ).toEqual([expect.stringContaining("at least 30 days")]);
  });

  it("rejects duplicate ids, empty documents, and impossible dates", () => {
    const problems = validateMaterialUpdates([
      update({ id: "a" }),
      update({ id: "a" }),
      update({ id: "b", documents: [] }),
      update({ id: "c", announcedOn: "2027-02-30" }),
      update({ id: "d", effectiveOn: "2027/03/01" }),
      update({ id: "2027-01-01" }),
    ]);
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining("a: duplicate id"),
        expect.stringContaining("b: documents is empty"),
        expect.stringContaining("c: announcedOn"),
        expect.stringContaining("d: effectiveOn"),
        expect.stringContaining("2027-01-01: id must not be a bare"),
      ]),
    );
  });
});

describe("policyToday", () => {
  it("uses the US Eastern calendar day, not UTC", () => {
    // 02:00 UTC on Jan 2 is still the evening of Jan 1 in New York.
    expect(policyToday(new Date("2027-01-02T02:00:00.000Z"))).toBe(
      "2027-01-01",
    );
    expect(policyToday(at("2027-01-02"))).toBe("2027-01-02");
  });
});

describe("latestMaterialUpdate", () => {
  it("returns null for an empty registry", () => {
    expect(latestMaterialUpdate([], at("2027-06-01"))).toBeNull();
  });

  it("ignores updates not yet announced", () => {
    expect(latestMaterialUpdate(UPDATES, at("2026-12-31"))).toBeNull();
    expect(latestMaterialUpdate(UPDATES, at("2027-02-15"))).toBe(MERCHANT_JAN);
  });

  it("counts an update as announced on its announcedOn day", () => {
    expect(latestMaterialUpdate(UPDATES, at("2027-03-01"))).toBe(PLATFORM_MAR);
  });

  it("returns the newest announced update regardless of array order", () => {
    expect(latestMaterialUpdate(UPDATES, at("2027-09-01"))).toBe(BOTH_MAY);
  });

  it("filters by bundle when asked", () => {
    expect(latestMaterialUpdate(UPDATES, at("2027-04-01"), "merchant")).toBe(
      MERCHANT_JAN,
    );
    expect(latestMaterialUpdate(UPDATES, at("2027-04-01"), "platform")).toBe(
      PLATFORM_MAR,
    );
    expect(latestMaterialUpdate(UPDATES, at("2027-09-01"), "merchant")).toBe(
      BOTH_MAY,
    );
  });

  it("breaks an announcedOn tie by the later effectiveOn", () => {
    const early = update({ id: "early", effectiveOn: "2027-02-01" });
    const late = update({ id: "late", effectiveOn: "2027-03-01" });
    expect(latestMaterialUpdate([late, early], at("2027-01-05"))).toBe(late);
    expect(latestMaterialUpdate([early, late], at("2027-01-05"))).toBe(late);
  });
});

describe("isPending", () => {
  it("is pending from announcement until the day before effectiveOn", () => {
    expect(isPending(MERCHANT_JAN, at("2027-01-01"))).toBe(true);
    expect(isPending(MERCHANT_JAN, at("2027-01-31"))).toBe(true);
  });

  it("is in effect from effectiveOn onward", () => {
    expect(isPending(MERCHANT_JAN, at("2027-02-01"))).toBe(false);
    expect(isPending(MERCHANT_JAN, at("2028-01-01"))).toBe(false);
  });
});

describe("findMaterialUpdate", () => {
  it("finds by id, null when unknown", () => {
    expect(findMaterialUpdate(UPDATES, "2027-03-platform")).toBe(PLATFORM_MAR);
    expect(findMaterialUpdate(UPDATES, "nope")).toBeNull();
  });
});

describe("clickwrapCoversUpdate", () => {
  it("covers when the accepted version is on/after announcement", () => {
    expect(clickwrapCoversUpdate("2027-01-01", MERCHANT_JAN)).toBe(true);
    expect(clickwrapCoversUpdate("2027-01-20", MERCHANT_JAN)).toBe(true);
  });

  it("does not cover an earlier version or nothing on file", () => {
    expect(clickwrapCoversUpdate("2026-12-31", MERCHANT_JAN)).toBe(false);
    expect(clickwrapCoversUpdate(null, MERCHANT_JAN)).toBe(false);
    expect(clickwrapCoversUpdate(undefined, MERCHANT_JAN)).toBe(false);
  });
});
