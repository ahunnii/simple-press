import { describe, expect, it } from "vitest";

/**
 * Regression guard for the SECTION_LINKS circular-import TDZ crash.
 *
 * The app can enter the module graph through a template module first
 * (e.g. template-fields.ts → default/index.ts → default/sections.ts) and only
 * then evaluate ~/lib/template-sections, which spreads every template's
 * section export at module scope. If any template `sections.ts` (or pink /
 * relocation per-page field module) holds a runtime import of
 * ~/lib/template-sections — even just for the SECTION_LINKS re-export — that
 * entry order dies with "Cannot access 'defaultTemplateSections' before
 * initialization". Template modules must import SECTION_LINKS from the leaf
 * ~/lib/section-links instead; imports of the TemplateSection type must stay
 * `import type` so they are erased.
 *
 * The dynamic imports below reproduce the template-first entry order; vitest's
 * per-file module isolation keeps other test files from pre-evaluating the
 * registry and masking the bug.
 */
describe("section-links module graph", () => {
  it("evaluates the registry after a template module without a TDZ crash", async () => {
    await import("~/app/(storefront)/_templates/default/sections");
    const { TEMPLATE_SECTIONS } = await import("~/lib/template-sections");
    expect(Object.keys(TEMPLATE_SECTIONS).length).toBeGreaterThan(0);
    expect(TEMPLATE_SECTIONS.default?.some((s) => s.links?.length)).toBe(true);
  });

  it("evaluates the registry after pink/relocation field modules too", async () => {
    await import("~/app/(storefront)/_templates/pink/homepage/index");
    await import("~/app/(storefront)/_templates/relocation/homepage/index");
    const { TEMPLATE_SECTIONS } = await import("~/lib/template-sections");
    expect(Object.keys(TEMPLATE_SECTIONS).length).toBeGreaterThan(0);
  });
});
