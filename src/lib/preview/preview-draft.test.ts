import { describe, expect, it } from "vitest";

import { isPreviewDraft } from "./preview-draft";

describe("isPreviewDraft", () => {
  it("accepts a populated draft object", () => {
    expect(isPreviewDraft({ "relocation.homepage.hero-heading": "Hi" })).toBe(
      true,
    );
    expect(isPreviewDraft({ _sp: { hidden: [] } })).toBe(true);
  });

  it("rejects SQL/JSON null and undefined", () => {
    expect(isPreviewDraft(null)).toBe(false);
    expect(isPreviewDraft(undefined)).toBe(false);
  });

  it("rejects the empty object a foreign Prisma.JsonNull sentinel produces", () => {
    // Regression: in dev, Turbopack HMR can hand the routers a re-instantiated
    // Prisma module whose JsonNull sentinel the globalThis-cached client does
    // not recognize — the "clear draft on publish" then writes `{}` instead of
    // JSON null. `{}` must read as "no draft" or the preview swap renders
    // template defaults everywhere after every publish.
    expect(isPreviewDraft({})).toBe(false);
  });

  it("rejects non-object junk", () => {
    expect(isPreviewDraft("")).toBe(false);
    expect(isPreviewDraft("{}")).toBe(false);
    expect(isPreviewDraft(0)).toBe(false);
    expect(isPreviewDraft([])).toBe(false);
    expect(isPreviewDraft(["a"])).toBe(false);
  });
});
