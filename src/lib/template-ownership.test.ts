import { describe, expect, it } from "vitest";

import { TEMPLATES } from "~/lib/constants";

import {
  getAvailableTemplates,
  getCommercialTemplateSubdomains,
  getFreeTemplateIds,
  isTemplateAvailableForSubdomain,
} from "./template-ownership";

describe("getAvailableTemplates", () => {
  it("gives the demo subdomain every registered template", () => {
    const availableIds = getAvailableTemplates("demo")
      .map((t) => t.value)
      .sort();
    const allTemplateIds = TEMPLATES.map((t) => t.id).sort();
    expect(availableIds).toEqual(allTemplateIds);

    // Spot-check ids that are easy to miss: a free template, a
    // commercial template with no "demo" opt-in, and the ownerless one.
    expect(availableIds).toContain("pollen");
    expect(availableIds).toContain("sledge");
    expect(availableIds).toContain("animated-bamboo");
  });

  it("marks every registered template available for demo via isTemplateAvailableForSubdomain", () => {
    for (const template of TEMPLATES) {
      expect(isTemplateAvailableForSubdomain(template.id, "demo")).toBe(true);
    }
  });

  it("gives an owning subdomain its free templates plus its owned commercial template", () => {
    const availableIds = getAvailableTemplates("dpc").map((t) => t.value);
    for (const freeId of getFreeTemplateIds()) {
      expect(availableIds).toContain(freeId);
    }
    expect(availableIds).toContain("pollen");
    expect(availableIds).not.toContain("olive");
  });

  it("gives a stranger subdomain exactly the free templates", () => {
    const availableIds = getAvailableTemplates("randomshop").map(
      (t) => t.value,
    );
    expect(availableIds.sort()).toEqual(getFreeTemplateIds().sort());
  });
});

describe("getCommercialTemplateSubdomains", () => {
  it("never includes the demo subdomain", () => {
    expect(getCommercialTemplateSubdomains()).not.toContain("demo");
  });
});
