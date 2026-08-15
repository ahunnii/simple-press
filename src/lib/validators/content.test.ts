import { describe, expect, it } from "vitest";

import { siteContentSchema } from "./content";

/**
 * Regression guard for a template-ownership bypass.
 *
 * `content.updateSiteContent` used to accept `templateId` and write it straight
 * to `Business.templateId` with no ownership check, while commercial templates
 * are gated per-subdomain by `isTemplateAvailableForSubdomain` and only
 * `business.updateTemplate` enforces that. Any OWNER/MANAGER could therefore
 * hand themselves a paid template by posting it through a content save.
 *
 * The fix is that this schema no longer declares `templateId` at all, so Zod
 * strips it and the router never sees it. If someone re-adds the key, these
 * tests fail.
 */
describe("siteContentSchema — templateId is not accepted", () => {
  it("strips templateId from a content save", () => {
    const parsed = siteContentSchema.parse({
      templateId: "pink",
      footerText: "Hello",
    });

    expect(parsed).not.toHaveProperty("templateId");
    expect(parsed).toEqual({ footerText: "Hello" });
  });

  it("strips templateId even when it is the only key", () => {
    expect(siteContentSchema.parse({ templateId: "pink" })).toEqual({});
  });

  it("still accepts the content fields the Brand Identity form sends", () => {
    const parsed = siteContentSchema.parse({
      footerText: "We are here for you.",
      socialLinks: { instagram: "https://instagram.com/store" },
      logoUrl: "https://cdn.example.com/logo.png",
      faviconUrl: "https://cdn.example.com/favicon.png",
      primaryColor: "#2563eb",
    });

    expect(parsed).toEqual({
      footerText: "We are here for you.",
      socialLinks: { instagram: "https://instagram.com/store" },
      logoUrl: "https://cdn.example.com/logo.png",
      faviconUrl: "https://cdn.example.com/favicon.png",
      primaryColor: "#2563eb",
    });
  });
});
