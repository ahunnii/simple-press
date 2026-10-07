import { describe, expect, it } from "vitest";

import { STORAGE_BASE } from "~/lib/s3/url";

import { iconVersion, resolveIconSource, resolveIconSources } from "./source";

const favicon = `${STORAGE_BASE}biz/favicon.png?v=1`;
const logo = `${STORAGE_BASE}biz/logo.png`;

describe("resolveIconSource", () => {
  it("prefers the favicon, then the logo", () => {
    expect(resolveIconSource({ faviconUrl: favicon, logoUrl: logo })).toBe(
      favicon,
    );
    expect(resolveIconSource({ faviconUrl: null, logoUrl: logo })).toBe(logo);
    expect(resolveIconSources({ faviconUrl: favicon, logoUrl: logo })).toEqual([
      favicon,
      logo,
    ]);
  });

  it("treats blank and whitespace-only values as missing and trims", () => {
    expect(resolveIconSource({ faviconUrl: "", logoUrl: logo })).toBe(logo);
    expect(resolveIconSource({ faviconUrl: "   ", logoUrl: ` ${logo} ` })).toBe(
      logo,
    );
  });

  it("rejects URLs outside our storage bucket", () => {
    expect(
      resolveIconSource({
        faviconUrl: "https://evil.example.com/favicon.png",
        logoUrl: "http://169.254.169.254/latest/meta-data",
      }),
    ).toBeNull();
    expect(
      resolveIconSources({
        faviconUrl: "https://evil.example.com/x.png",
        logoUrl: logo,
      }),
    ).toEqual([logo]);
  });

  it("returns null for missing site content", () => {
    expect(resolveIconSource(null)).toBeNull();
    expect(resolveIconSource(undefined)).toBeNull();
    expect(resolveIconSources({})).toEqual([]);
  });
});

describe("iconVersion", () => {
  it("is a stable 8-hex hash that changes with the source", () => {
    expect(iconVersion(favicon)).toMatch(/^[0-9a-f]{8}$/);
    expect(iconVersion(favicon)).toBe(iconVersion(favicon));
    expect(iconVersion(favicon)).not.toBe(iconVersion(logo));
  });

  it("uses a constant when there is no source", () => {
    expect(iconVersion(null)).toBe("sp");
  });
});
