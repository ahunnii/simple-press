import { describe, expect, it } from "vitest";

import { selectFieldPages } from "./fields";
import { getFieldRegistry, getServiceFieldInfo } from "./registry";

describe("getFieldRegistry (real template registry)", () => {
  it("resolves labels for a known template", () => {
    const reg = getFieldRegistry("dream");
    expect(reg.resolved).toBe(true);
    expect(reg.fields.length).toBeGreaterThan(10);
    expect(reg.groupTitles["homepage.hero"]).toBe("Hero");
    expect(reg.pageTitles.homepage).toBe("Homepage");

    const heroKey = "dream.homepage.hero-heading";
    const pages = selectFieldPages(reg, { [heroKey]: "Hello" });
    expect(pages).toHaveLength(1);
    expect(pages[0]!.title).toBe("Home page sections");
    expect(pages[0]!.groups[0]!.title).toBe("Hero");
    expect(pages[0]!.groups[0]!.fields[0]!.def.label).toBe("Heading");
  });

  it("marks unknown templates unresolved", () => {
    expect(getFieldRegistry("no-such-template").resolved).toBe(false);
  });

  it("provides service page field info", () => {
    expect(getServiceFieldInfo("service-one").fields.length).toBeGreaterThan(0);
  });
});
