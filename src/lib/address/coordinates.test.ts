import { describe, expect, it } from "vitest";

import {
  googleMapsUrls,
  isValidLatitude,
  isValidLongitude,
  parseCoordinate,
  parseCoordinatePair,
  resolveMapCoordinates,
} from "./coordinates";

describe("isValidLatitude", () => {
  it("accepts the range edges", () => {
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(0)).toBe(true);
  });

  it("rejects values just outside the range", () => {
    expect(isValidLatitude(90.0001)).toBe(false);
    expect(isValidLatitude(-90.0001)).toBe(false);
  });

  it("rejects non-finite and non-number values", () => {
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLatitude(Infinity)).toBe(false);
    expect(isValidLatitude(-Infinity)).toBe(false);
    expect(isValidLatitude("42")).toBe(false);
    expect(isValidLatitude(null)).toBe(false);
    expect(isValidLatitude(undefined)).toBe(false);
  });
});

describe("isValidLongitude", () => {
  it("accepts the range edges", () => {
    expect(isValidLongitude(180)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(0)).toBe(true);
  });

  it("rejects values just outside the range", () => {
    expect(isValidLongitude(180.0001)).toBe(false);
    expect(isValidLongitude(-180.0001)).toBe(false);
  });

  it("rejects non-finite and non-number values", () => {
    expect(isValidLongitude(NaN)).toBe(false);
    expect(isValidLongitude(Infinity)).toBe(false);
    expect(isValidLongitude("42")).toBe(false);
    expect(isValidLongitude(null)).toBe(false);
    expect(isValidLongitude(undefined)).toBe(false);
  });
});

describe("parseCoordinatePair", () => {
  it("parses comma+space separated pairs", () => {
    expect(parseCoordinatePair("42.43, -83.14")).toEqual({
      latitude: 42.43,
      longitude: -83.14,
    });
  });

  it("parses space separated pairs", () => {
    expect(parseCoordinatePair("42.43 -83.14")).toEqual({
      latitude: 42.43,
      longitude: -83.14,
    });
  });

  it("parses parenthesized pairs", () => {
    expect(parseCoordinatePair("(42.43,-83.14)")).toEqual({
      latitude: 42.43,
      longitude: -83.14,
    });
  });

  it("parses bare comma separated pairs", () => {
    expect(parseCoordinatePair("42.43,-83.14")).toEqual({
      latitude: 42.43,
      longitude: -83.14,
    });
  });

  it("parses a Google Maps URL's @lat,lng, segment", () => {
    expect(
      parseCoordinatePair(
        "https://www.google.com/maps/place/Foo/@42.43,-83.14,15z/data=abc",
      ),
    ).toEqual({ latitude: 42.43, longitude: -83.14 });
  });

  it("parses a Google Maps URL's ?q= param", () => {
    expect(
      parseCoordinatePair("https://maps.google.com/?q=42.43,-83.14"),
    ).toEqual({ latitude: 42.43, longitude: -83.14 });
  });

  it("parses a Google Maps URL's query= param", () => {
    expect(
      parseCoordinatePair(
        "https://www.google.com/maps/search/?api=1&query=42.43,-83.14",
      ),
    ).toEqual({ latitude: 42.43, longitude: -83.14 });
  });

  it("returns null for garbage input", () => {
    expect(parseCoordinatePair("abc")).toBeNull();
    expect(parseCoordinatePair("42.4")).toBeNull();
    expect(parseCoordinatePair("")).toBeNull();
    expect(parseCoordinatePair("   ")).toBeNull();
  });

  it("returns null when a parsed value is out of range", () => {
    expect(parseCoordinatePair("999, 0")).toBeNull();
  });
});

describe("parseCoordinate", () => {
  it("parses numbers as-is when finite", () => {
    expect(parseCoordinate(42.43)).toBe(42.43);
    expect(parseCoordinate(0)).toBe(0);
  });

  it("returns null for non-finite numbers", () => {
    expect(parseCoordinate(NaN)).toBeNull();
    expect(parseCoordinate(Infinity)).toBeNull();
  });

  it("parses trimmed numeric strings", () => {
    expect(parseCoordinate(" 42.43 ")).toBe(42.43);
    expect(parseCoordinate("-83.14")).toBe(-83.14);
  });

  it("returns null for empty or blank strings", () => {
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("   ")).toBeNull();
  });

  it("returns null for non-numeric strings and other types", () => {
    expect(parseCoordinate("abc")).toBeNull();
    expect(parseCoordinate(null)).toBeNull();
    expect(parseCoordinate(undefined)).toBeNull();
    expect(parseCoordinate({})).toBeNull();
  });
});

describe("resolveMapCoordinates", () => {
  it("prefers settings when both lat/lng are valid", () => {
    expect(
      resolveMapCoordinates(
        { latitude: 42.43, longitude: -83.14 },
        "1.1",
        "2.2",
      ),
    ).toEqual({ latitude: 42.43, longitude: -83.14, source: "settings" });
  });

  it("falls back to legacy when settings is a half pair", () => {
    expect(
      resolveMapCoordinates(
        { latitude: 42.43, longitude: null },
        "1.1",
        "2.2",
      ),
    ).toEqual({ latitude: 1.1, longitude: 2.2, source: "legacy" });
  });

  it("falls back to legacy when settings is missing entirely", () => {
    expect(resolveMapCoordinates(null, "1.1", "2.2")).toEqual({
      latitude: 1.1,
      longitude: 2.2,
      source: "legacy",
    });
    expect(resolveMapCoordinates(undefined, "1.1", "2.2")).toEqual({
      latitude: 1.1,
      longitude: 2.2,
      source: "legacy",
    });
  });

  it("parses legacy string values", () => {
    expect(resolveMapCoordinates(undefined, "42.43", "-83.14")).toEqual({
      latitude: 42.43,
      longitude: -83.14,
      source: "legacy",
    });
  });

  it("parses legacy numeric values", () => {
    expect(resolveMapCoordinates(undefined, 42.43, -83.14)).toEqual({
      latitude: 42.43,
      longitude: -83.14,
      source: "legacy",
    });
  });

  it("treats legacy empty strings as missing", () => {
    expect(resolveMapCoordinates(undefined, "", "")).toBeNull();
  });

  it("ignores a legacy half pair", () => {
    expect(resolveMapCoordinates(undefined, "42.43", "")).toBeNull();
    expect(resolveMapCoordinates(undefined, "", "-83.14")).toBeNull();
  });

  it("returns null when both settings and legacy are missing", () => {
    expect(resolveMapCoordinates(null, undefined, undefined)).toBeNull();
    expect(resolveMapCoordinates(undefined)).toBeNull();
  });

  it("returns null when legacy values are out of range", () => {
    expect(resolveMapCoordinates(undefined, "999", "0")).toBeNull();
  });
});

describe("googleMapsUrls", () => {
  it("prefers and encodes a non-empty address string", () => {
    const { viewUrl, directionsUrl } = googleMapsUrls(
      "123 Main St, Detroit, MI #100",
    );
    expect(viewUrl).toBe(
      "https://www.google.com/maps/search/?api=1&query=123%20Main%20St%2C%20Detroit%2C%20MI%20%23100",
    );
    expect(directionsUrl).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=123%20Main%20St%2C%20Detroit%2C%20MI%20%23100",
    );
  });

  it("uses lat,lng when given coordinates", () => {
    const { viewUrl, directionsUrl } = googleMapsUrls({
      latitude: 42.43,
      longitude: -83.14,
    });
    expect(viewUrl).toBe(
      "https://www.google.com/maps/search/?api=1&query=42.43,-83.14",
    );
    expect(directionsUrl).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=42.43,-83.14",
    );
  });
});
