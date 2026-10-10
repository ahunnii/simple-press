import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SiteExportBusiness } from "./types";

import { buildLicenseFiles } from "./licenses";

const LICENSE_FALLBACK =
  "GNU Affero General Public License v3.0 — full text: https://www.gnu.org/licenses/agpl-3.0.txt";

const business: SiteExportBusiness = {
  id: "biz_1",
  name: "Sunny Mug Co",
  slug: "sunny-mug",
  templateId: "default",
  siteUrl: "https://sunnymug.example.com",
  supportEmail: "owner@sunnymug.example.com",
  customDomain: null,
  exportedAt: new Date("2026-10-09T15:30:00Z"),
};

const LICENSE_PATH = "Licenses/LICENSE-AGPL-3.0.txt";
const NOTICE_PATH = "Licenses/NOTICE.txt";

function findFile(
  files: { path: string; contents: string | Uint8Array }[],
  p: string,
) {
  const file = files.find((f) => f.path === p);
  if (!file) throw new Error(`missing ${p}`);
  return String(file.contents);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildLicenseFiles", () => {
  it("returns the license text and NOTICE under Licenses/", async () => {
    const files = await buildLicenseFiles(business);
    expect(files.map((f) => f.path)).toEqual([LICENSE_PATH, NOTICE_PATH]);
  });

  it("ships the real root LICENSE text", async () => {
    const files = await buildLicenseFiles(business);
    const license = findFile(files, LICENSE_PATH);
    expect(license).toMatch(/^\s*GNU AFFERO GENERAL PUBLIC LICENSE/);
    expect(license).not.toBe(LICENSE_FALLBACK);
  });

  it("NOTICE names the business and the export date (YYYY-MM-DD)", async () => {
    const files = await buildLicenseFiles(business);
    const notice = findFile(files, NOTICE_PATH);
    expect(notice).toContain(
      "This export was created from Sunny Mug Co's SimplePress site on 2026-10-09.",
    );
    expect(notice).toContain("Sunny Mug Co's");
  });

  it("NOTICE lists the platform support email, not the store's", async () => {
    const files = await buildLicenseFiles(business);
    const notice = findFile(files, NOTICE_PATH);
    expect(notice).toContain("csdt@generativejustice.org");
    expect(notice).not.toContain("owner@sunnymug.example.com");
  });

  it("NOTICE uses LF line endings and wraps at 80 columns", async () => {
    const files = await buildLicenseFiles(business);
    const notice = findFile(files, NOTICE_PATH);
    expect(notice).not.toContain("\r");
    for (const line of notice.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it("falls back to the pointer text when LICENSE cannot be read", async () => {
    vi.spyOn(fs.promises, "readFile").mockRejectedValueOnce(
      Object.assign(new Error("ENOENT: no such file"), { code: "ENOENT" }),
    );
    const files = await buildLicenseFiles(business);
    expect(findFile(files, LICENSE_PATH)).toBe(LICENSE_FALLBACK);
    expect(findFile(files, NOTICE_PATH)).toContain("Sunny Mug Co's");
  });
});
