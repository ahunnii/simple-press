/**
 * `isProtectedBrandAssetKey` — the Media Library's narrowed logo/favicon guard.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("~/server/db", () => ({ db: {} }));

const { isProtectedBrandAssetKey } = await import("./brand-asset-keys");
const { keyToPublicUrl } = await import("~/lib/s3/url");

const BIZ = "biz_1";
const url = (name: string) => keyToPublicUrl(`${BIZ}/${name}`);

describe("isProtectedBrandAssetKey — logo", () => {
  it("protects the logo that is currently saved", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/logo.svg`, { logoUrl: url("logo.svg") }),
    ).toBe(true);
  });

  it("does not protect a stale logo.png once logoUrl is logo.svg", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/logo.png`, { logoUrl: url("logo.svg") }),
    ).toBe(false);
  });

  it("protects any logo.* while logoUrl is null / empty (upload lag)", () => {
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.png`, { logoUrl: null })).toBe(
      true,
    );
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.png`, {})).toBe(true);
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.png`, { logoUrl: "" })).toBe(
      true,
    );
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.png`, { logoUrl: "  " })).toBe(
      true,
    );
  });

  it("ignores a ?v= cache-buster on the saved logoUrl", () => {
    const brand = { logoUrl: `${url("logo.png")}?v=123` };
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.png`, brand)).toBe(true);
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.svg`, brand)).toBe(false);
  });

  it("does not protect old logo.* when logoUrl is a library image", () => {
    const brand = { logoUrl: url("library-abc123.png") };
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.png`, brand)).toBe(false);
    expect(isProtectedBrandAssetKey(`${BIZ}/logo.svg`, brand)).toBe(false);
  });

  it("does not protect old logo.* when logoUrl is an external URL", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/logo.png`, {
        logoUrl: "https://example.com/logo.png",
      }),
    ).toBe(false);
  });

  it("judges logo.* against logoUrl only, not faviconUrl", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/logo.png`, {
        logoUrl: url("logo.svg"),
        faviconUrl: url("logo.png"),
      }),
    ).toBe(false);
  });
});

describe("isProtectedBrandAssetKey — favicon", () => {
  it("protects the saved favicon", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/favicon.ico`, {
        faviconUrl: url("favicon.ico"),
      }),
    ).toBe(true);
  });

  it("does not protect a stale favicon.* once faviconUrl moved on", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/favicon.ico`, {
        faviconUrl: url("favicon.png"),
      }),
    ).toBe(false);
  });

  it("protects any favicon.* while faviconUrl is empty", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/favicon.ico`, { faviconUrl: null }),
    ).toBe(true);
  });

  it("ignores ?v= on faviconUrl, and a saved logo does not shield favicons", () => {
    expect(
      isProtectedBrandAssetKey(`${BIZ}/favicon.png`, {
        logoUrl: url("logo.png"),
        faviconUrl: `${url("favicon.png")}?v=2`,
      }),
    ).toBe(true);
    expect(
      isProtectedBrandAssetKey(`${BIZ}/favicon.ico`, {
        logoUrl: url("favicon.ico"),
        faviconUrl: url("favicon.png"),
      }),
    ).toBe(false);
  });
});

describe("isProtectedBrandAssetKey — other keys", () => {
  it("never protects non-brand keys", () => {
    const brand = { logoUrl: null, faviconUrl: null };
    expect(isProtectedBrandAssetKey(`${BIZ}/hero.png`, brand)).toBe(false);
    expect(isProtectedBrandAssetKey(`${BIZ}/library-abc.png`, brand)).toBe(
      false,
    );
    expect(isProtectedBrandAssetKey("logo.png", brand)).toBe(false);
  });
});
