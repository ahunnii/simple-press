import { describe, expect, it } from "vitest";

import { COMMON_TIME_ZONES, isValidTimeZone } from "./time-zones";

describe("isValidTimeZone", () => {
  it("accepts the platform default zone", () => {
    expect(isValidTimeZone("America/Detroit")).toBe(true);
  });

  it("accepts any real IANA zone, not just the curated ones", () => {
    expect(isValidTimeZone("Pacific/Auckland")).toBe(true);
    expect(isValidTimeZone("Asia/Kathmandu")).toBe(true);
    expect(COMMON_TIME_ZONES.some((z) => z.value === "Pacific/Auckland")).toBe(
      false,
    );
  });

  it("accepts UTC", () => {
    expect(isValidTimeZone("UTC")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidTimeZone("")).toBe(false);
  });

  it("rejects a made-up zone", () => {
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
  });

  it("rejects a malformed zone string", () => {
    expect(isValidTimeZone("EST5EDT!")).toBe(false);
  });
});

describe("COMMON_TIME_ZONES", () => {
  it("lists America/Detroit first", () => {
    expect(COMMON_TIME_ZONES[0]).toEqual({
      value: "America/Detroit",
      label: "Eastern Time — Detroit",
    });
  });

  it("only contains zones the runtime can resolve", () => {
    for (const zone of COMMON_TIME_ZONES) {
      expect(isValidTimeZone(zone.value), zone.value).toBe(true);
    }
  });

  it("has no duplicate values", () => {
    const values = COMMON_TIME_ZONES.map((z) => z.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("uses human labels rather than raw IANA ids", () => {
    for (const zone of COMMON_TIME_ZONES) {
      expect(zone.label, zone.value).not.toContain("/");
      expect(zone.label.length, zone.value).toBeGreaterThan(0);
    }
  });
});
