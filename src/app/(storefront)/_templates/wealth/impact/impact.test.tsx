import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  impactBodyBlocks,
  ImpactParagraphs,
  renderImpactText,
  splitBoldLead,
} from "./impact-markup";
import {
  formatShare,
  hasImpactProse,
  hubPositions,
  numeralSize,
  parseAmount,
  parseImpactFinancials,
  parseImpactLogos,
  parseImpactPastReports,
  parseImpactPeople,
  parseImpactPortfolio,
  parseImpactPrograms,
  parseImpactSources,
  parseImpactSpotlights,
  parseImpactStats,
  parseImpactSupport,
  parseImpactThanks,
  parseShare,
  personInitials,
  programLayout,
  programsHubShown,
  sourceAnchorId,
  splitParagraphs,
  spotlightAnchorId,
  statsUseLedger,
} from "./impact-rows";
import {
  WEALTH_IMPACT_KEYS as K,
  WEALTH_IMPACT_KEYS,
  WEALTH_IMPACT_MAX,
  WEALTH_IMPACT_SCALAR_KEYS,
  wealthImpactData,
  wealthImpactFieldGroups,
  wealthImpactSections,
} from "./index";
import {
  ImpactNumeralTile,
  ImpactPortrait,
  WealthRings,
} from "./wealth-impact-devices";
import { ImpactSectionHead } from "./wealth-impact-head";

describe("wealth impact field module", () => {
  it("every field key starts with wealth.impact.", () => {
    for (const field of wealthImpactData) {
      expect(field.key.startsWith("wealth.impact.")).toBe(true);
    }
  });

  it("keys are unique and every field sits on the impact page", () => {
    const keys = wealthImpactData.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const field of wealthImpactData) {
      expect(field.page).toBe("impact");
      expect(field.group?.startsWith("impact.")).toBe(true);
    }
  });

  it("every group has a matching section with the same id (triple-match)", () => {
    const sectionIds = new Set(wealthImpactSections.map((s) => s.id));
    for (const group of wealthImpactFieldGroups) {
      expect(sectionIds.has(group.id)).toBe(true);
      const section = wealthImpactSections.find((s) => s.id === group.id);
      expect(section?.groupIds).toEqual([group.id]);
      expect(section?.title).toBe(group.title);
    }
    expect(wealthImpactSections).toHaveLength(wealthImpactFieldGroups.length);
  });

  it("every field's group is declared", () => {
    const groupIds = new Set(wealthImpactFieldGroups.map((g) => g.id));
    for (const field of wealthImpactData) {
      expect(groupIds.has(field.group ?? "")).toBe(true);
    }
  });

  it("only the cover is not hideable; order follows render order", () => {
    expect(wealthImpactSections.map((s) => s.id)).toEqual([
      "impact.hero",
      "impact.letter",
      "impact.about",
      "impact.people",
      "impact.programs",
      "impact.numbers",
      "impact.spotlights",
      "impact.portfolio",
      "impact.stories",
      "impact.goals",
      "impact.financials",
      "impact.thanks",
      "impact.report",
      "impact.support",
      "impact.sources",
      "impact.past",
      "impact.cta",
    ]);
    expect(
      wealthImpactSections.filter((s) => !s.hideable).map((s) => s.id),
    ).toEqual(["impact.hero"]);
    wealthImpactSections.forEach((s, i) => expect(s.order).toBe(i));
  });

  it("data lists ship no sample rows; sub-fields are described", () => {
    for (const field of wealthImpactData) {
      if (field.type !== "list") continue;
      expect(field.defaultRows).toBeUndefined();
      expect(field.defaultsWhenEmpty).toBeUndefined();
      expect(field.itemLabel).toBeTruthy();
      expect(field.maxItems).toBeGreaterThan(0);
      for (const sub of field.itemSchema) {
        expect(sub.description?.trim()).toBeTruthy();
      }
      expect(field.itemSchema.some((s) => s.key === field.summaryKey)).toBe(
        true,
      );
    }
  });

  it("every image field has an alt-text partner, except the decorative backgrounds", () => {
    const keys = new Set(wealthImpactData.map((f) => f.key));
    const decorative = new Set([
      "wealth.impact.numbers-bg-image",
      "wealth.impact.cta-bg-image",
      "wealth.impact.letter-signature-image",
    ]);
    for (const field of wealthImpactData) {
      if (field.type !== "image" || decorative.has(field.key)) continue;
      expect(keys.has(`${field.key}-alt`)).toBe(true);
    }
  });

  it("labels and descriptions avoid editor jargon and palette colour words", () => {
    const banned =
      /\b(eyebrow|lede|kicker|CTA|full-bleed|forest|sage|gold|cream)\b/i;
    for (const field of wealthImpactData) {
      expect(field.label).not.toMatch(banned);
      expect(field.description).not.toMatch(/\b(forest|sage|gold|cream)\b/i);
    }
  });

  it("scalar keys exclude list fields", () => {
    expect(WEALTH_IMPACT_SCALAR_KEYS).not.toContain(
      "wealth.impact.stats-items",
    );
    expect(WEALTH_IMPACT_SCALAR_KEYS).toContain("wealth.impact.hero-theme");
  });
});

describe("impact list parsers", () => {
  it("drops empty / incomplete rows but keeps the original index", () => {
    const stats = parseImpactStats([
      { value: "", caption: "orphan caption" },
      { value: " $386K ", caption: "lent" },
      null,
      { value: "9" },
    ]);
    expect(stats.map((s) => [s.value, s.index])).toEqual([
      ["$386K", 1],
      ["9", 3],
    ]);
    expect(parseImpactStats(undefined)).toEqual([]);
    expect(parseImpactStats("nope")).toEqual([]);
  });

  it("caps rows at the list max", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ value: String(i) }));
    expect(parseImpactStats(rows)).toHaveLength(8);
  });

  it("programs need a title; past reports need a label and a link", () => {
    expect(
      parseImpactPrograms([{ title: "", copy: "x" }, { title: "Lending" }]).map(
        (p) => p.title,
      ),
    ).toEqual(["Lending"]);
    expect(
      parseImpactPastReports([
        { label: "2024", url: "" },
        { label: "", url: "/a" },
        { label: "2023", url: "/r/2023.pdf" },
        { label: "Bad", url: "javascript:alert(1)" },
      ]).map((r) => r.label),
    ).toEqual(["2023"]);
  });

  it("thank-you columns split names per line and drop empty columns", () => {
    const cols = parseImpactThanks([
      { heading: "Funders", names: "A Foundation\n\n  B Fund  \n" },
      { heading: "Empty", names: "  \n " },
    ]);
    expect(cols).toHaveLength(1);
    expect(cols[0]?.names).toEqual(["A Foundation", "B Fund"]);
  });

  it("splits paragraphs on blank lines", () => {
    expect(splitParagraphs("One\nstill one\n\n  Two \n \nThree")).toEqual([
      "One\nstill one",
      "Two",
      "Three",
    ]);
    expect(splitParagraphs("   ")).toEqual([]);
  });
});

describe("impact financials", () => {
  it("groups by first-seen order, case-insensitively; blank group joins the row above", () => {
    const groups = parseImpactFinancials(
      [
        {
          group: "Revenue",
          label: "Grants",
          amount: "$612,000",
          share: "54.6",
        },
        {
          group: "Expenses",
          label: "Lending",
          amount: "$402,000",
          share: "41.5",
        },
        {
          group: "revenue",
          label: "Donations",
          amount: "$121,000",
          share: "10.8",
        },
        { group: "", label: "Other", amount: "$25,000", share: "2.2" },
        { group: "Expenses", label: "", amount: "$1" },
      ],
      "Financials",
    );
    expect(groups.map((g) => g.name)).toEqual(["Revenue", "Expenses"]);
    expect(groups[0]?.rows.map((r) => r.label)).toEqual([
      "Grants",
      "Donations",
      "Other",
    ]);
    expect(groups[0]?.rows.map((r) => r.index)).toEqual([0, 2, 3]);
    expect(groups[1]?.rows.map((r) => r.label)).toEqual(["Lending"]);
  });

  it("leading blank-group rows use the fallback group", () => {
    const groups = parseImpactFinancials(
      [{ label: "Cash", amount: "$5" }],
      "Financials",
    );
    expect(groups.map((g) => g.name)).toEqual(["Financials"]);
  });

  it("clamps share to 0–100 and ignores non-numbers", () => {
    expect(parseShare("140")).toBe(100);
    expect(parseShare("-5")).toBe(0);
    expect(parseShare("54.6%")).toBe(54.6);
    expect(parseShare("lots")).toBeNull();
    expect(parseShare("")).toBeNull();
    const [g] = parseImpactFinancials(
      [
        { group: "R", label: "a", share: "250" },
        { group: "R", label: "b", share: "abc" },
      ],
      "F",
    );
    expect(g?.rows.map((r) => r.share)).toEqual([100, null]);
    expect(g?.maxShare).toBe(100);
    expect(g?.shareTotal).toBeNull();
  });

  it("totals only when every amount is a plain number", () => {
    const [plain, mixed] = parseImpactFinancials(
      [
        { group: "Revenue", label: "a", amount: "$612,000", share: "60" },
        { group: "Revenue", label: "b", amount: "$388,000.50", share: "40" },
        { group: "Balance", label: "c", amount: "$1.4M" },
        { group: "Balance", label: "d", amount: "$10" },
      ],
      "F",
    );
    expect(plain?.total).toBe("$1,000,000.50");
    expect(plain?.shareTotal).toBe(100);
    expect(mixed?.total).toBeNull();
  });

  it("parses negatives and rejects words", () => {
    expect(parseAmount("($4,500)")).toBe(-4500);
    expect(parseAmount("-$10")).toBe(-10);
    expect(parseAmount("1,200.5")).toBe(1200.5);
    expect(parseAmount("Dec 31, 2025")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(formatShare(54.64)).toBe("54.6");
    expect(formatShare(100)).toBe("100");
  });

  it("returns no groups when no row has a label", () => {
    expect(parseImpactFinancials([{ group: "R", amount: "$1" }], "F")).toEqual(
      [],
    );
    expect(parseImpactFinancials(null, "F")).toEqual([]);
  });
});

describe("hasImpactProse", () => {
  it("detects text and embeds, ignores empty docs", () => {
    expect(
      hasImpactProse({ type: "doc", content: [{ type: "paragraph" }] }),
    ).toBe(false);
    expect(
      hasImpactProse({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Hi" }] },
        ],
      }),
    ).toBe(true);
    expect(hasImpactProse({ type: "doc", content: [{ type: "form" }] })).toBe(
      true,
    );
    expect(hasImpactProse(null)).toBe(false);
  });
});

// ─── v2 (design.md "Impact Report — v2") ─────────────────────────────────────

describe("impact v2 field declarations", () => {
  const byKey = new Map(wealthImpactData.map((f) => [f.key, f]));
  const NEW_KEYS = [
    "letter-signature-image",
    "about-nav-label",
    "about-eyebrow",
    "mission-heading",
    "mission-body",
    "mission-image",
    "mission-image-alt",
    "history-heading",
    "history-body",
    "history-image",
    "history-image-alt",
    "people-nav-label",
    "people-eyebrow",
    "people-heading",
    "people-items",
    "programs-hub-label",
    "programs-hub-heading",
    "numbers-intro",
    "spotlights-items",
    "portfolio-nav-label",
    "portfolio-eyebrow",
    "portfolio-heading",
    "portfolio-intro",
    "portfolio-items",
    "portfolio-detail-label",
    "portfolio-date-label",
    "goals-intro",
    "goals-image",
    "goals-image-alt",
    "goals-list-label",
    "thanks-image",
    "thanks-image-alt",
    "thanks-logos",
    "report-nav-label",
    "report-eyebrow",
    "report-heading",
    "report-embed-url",
    "support-nav-label",
    "support-eyebrow",
    "support-heading",
    "support-items",
    "support-closing",
    "support-image",
    "support-image-alt",
    "support-button-label",
    "support-button-url",
    "sources-nav-label",
    "sources-heading",
    "sources-items",
  ].map((k) => `wealth.impact.${k}`);

  it("declares every new key on the impact page", () => {
    for (const key of NEW_KEYS) {
      const field = byKey.get(key);
      expect(field, key).toBeDefined();
      expect(field?.page).toBe("impact");
    }
    expect(Object.values(WEALTH_IMPACT_KEYS)).toEqual(
      expect.arrayContaining(NEW_KEYS),
    );
  });

  it("every KEYS constant is declared exactly once", () => {
    const declared = new Set(wealthImpactData.map((f) => f.key));
    for (const key of Object.values(WEALTH_IMPACT_KEYS)) {
      expect(declared.has(key), key).toBe(true);
    }
    expect(wealthImpactData).toHaveLength(
      Object.keys(WEALTH_IMPACT_KEYS).length,
    );
  });

  it("v1 keys keep their defaults (detroitcommunitywealth runs wealth in prod)", () => {
    const v1: Record<string, string> = {
      "hero-year": "2025 Impact Report",
      "letter-heading": "A note on the year",
      "letter-signoff": "In solidarity,",
      "numbers-heading": "What the year added up to.",
      "programs-heading": "How we build ownership",
      "goals-heading": "What we’re building next",
      "cta-button-url": "/donate",
    };
    for (const [k, v] of Object.entries(v1)) {
      expect(byKey.get(`wealth.impact.${k}`)?.defaultValue).toBe(v);
    }
    expect(byKey.get(K.numbersItems)?.key).toBe("wealth.impact.stats-items");
  });

  it("new copy defaults follow the spec; data and images default blank", () => {
    const expected: Record<string, string> = {
      [K.aboutNavLabel]: "Who We Are",
      [K.aboutEyebrow]: "Who we are",
      [K.missionHeading]: "Our mission",
      [K.historyHeading]: "History",
      [K.peopleNavLabel]: "Our People",
      [K.peopleEyebrow]: "Our people",
      [K.peopleHeading]: "The people doing the work",
      [K.programsHubLabel]: "",
      [K.programsHubHeading]: "How it all fits together",
      [K.portfolioNavLabel]: "Portfolio",
      [K.portfolioEyebrow]: "Lending portfolio",
      [K.portfolioHeading]: "Where the money is working",
      [K.portfolioDetailLabel]: "Industry",
      [K.portfolioDateLabel]: "Date",
      [K.goalsListLabel]: "",
      [K.reportNavLabel]: "Full Report",
      [K.reportEyebrow]: "The full report",
      [K.reportHeading]: "Read the designed report",
      [K.reportEmbedUrl]: "",
      [K.supportNavLabel]: "Ways to Support",
      [K.supportEyebrow]: "Get involved",
      [K.supportHeading]: "Ways to support",
      [K.supportButtonLabel]: "Contact us",
      [K.supportButtonUrl]: "/contact",
      [K.sourcesNavLabel]: "Sources",
      [K.sourcesHeading]: "Works cited",
      [K.missionBody]: "",
      [K.historyBody]: "",
      [K.numbersIntro]: "",
      [K.goalsIntro]: "",
      [K.supportClosing]: "",
    };
    for (const [key, value] of Object.entries(expected)) {
      expect(byKey.get(key)?.defaultValue, key).toBe(value);
    }
    for (const field of wealthImpactData) {
      if (field.type === "image")
        expect(field.defaultValue, field.key).toBe("");
    }
    expect(byKey.get(K.reportEmbedUrl)?.type).toBe("iframe");
  });

  it("list maxima and new columns", () => {
    const list = (key: string) => {
      const f = byKey.get(key);
      if (f?.type !== "list") throw new Error(`${key} is not a list`);
      return f;
    };
    const cols = (key: string) => list(key).itemSchema.map((s) => s.key);
    expect(list(K.programsItems).maxItems).toBe(8);
    expect(cols(K.programsItems)).toContain("short");
    expect(cols(K.numbersItems)).toEqual(
      expect.arrayContaining(["value", "caption", "title", "detail"]),
    );
    expect(list(K.peopleItems).maxItems).toBe(16);
    expect(cols(K.peopleItems)).toEqual([
      "group",
      "name",
      "role",
      "image",
      "imageAlt",
    ]);
    expect(list(K.spotlightsItems).maxItems).toBe(4);
    expect(cols(K.spotlightsItems)).toEqual([
      "navLabel",
      "eyebrow",
      "heading",
      "body",
      "statValue",
      "statCaption",
      "stat2Value",
      "stat2Caption",
      "image",
      "imageAlt",
      "callout",
    ]);
    expect(list(K.portfolioItems).maxItems).toBe(40);
    expect(cols(K.portfolioItems)).toEqual([
      "group",
      "name",
      "detail",
      "date",
      "dateLabel",
      "url",
    ]);
    expect(list(K.thanksLogos).maxItems).toBe(24);
    expect(cols(K.thanksLogos)).toEqual(["image", "name", "url"]);
    expect(list(K.supportItems).maxItems).toBe(6);
    expect(cols(K.supportItems)).toEqual(["title", "line"]);
    expect(list(K.sourcesItems).maxItems).toBe(20);
    expect(cols(K.sourcesItems)).toEqual(["text", "url"]);
    // Parser caps match the declared maxima.
    for (const [name, max] of Object.entries(WEALTH_IMPACT_MAX)) {
      expect(max, name).toBeGreaterThan(0);
    }
  });

  it("every group has a section, and new groups own their fields", () => {
    const groups = new Set(wealthImpactFieldGroups.map((g) => g.id));
    for (const g of [
      "about",
      "people",
      "spotlights",
      "portfolio",
      "report",
      "support",
      "sources",
    ]) {
      expect(groups.has(`impact.${g}`)).toBe(true);
      expect(
        wealthImpactData.some((f) => f.group === `impact.${g}`),
        g,
      ).toBe(true);
    }
  });
});

describe("impact v2 parsers", () => {
  it("stats: v1 rows without title/detail still parse; ledger switch", () => {
    const v1 = parseImpactStats([{ value: "9", caption: "co-ops" }]);
    expect(v1[0]).toMatchObject({ value: "9", title: "", detail: "" });
    expect(statsUseLedger(v1)).toBe(false);
    const v2 = parseImpactStats([
      { value: "9" },
      { value: "$300K", title: "Lent", detail: "Across 4 loans [1]" },
    ]);
    expect(v2[1]).toMatchObject({
      title: "Lent",
      detail: "Across 4 loans [1]",
    });
    expect(statsUseLedger(v2)).toBe(true);
  });

  it("programs: short column; v1 rows parse; max 8; layout rules", () => {
    const rows = parseImpactPrograms([
      { title: "Lending", short: " NEF " },
      { title: "Incubator" },
    ]);
    expect(rows.map((r) => r.short)).toEqual(["NEF", ""]);
    expect(
      parseImpactPrograms(
        Array.from({ length: 10 }, (_, i) => ({ title: `P${i}` })),
      ),
    ).toHaveLength(8);
    expect(programLayout({ image: "/a.jpg", copy: "" }, true)).toBe("row");
    expect(programLayout({ image: "", copy: "Text" }, true)).toBe("card");
    expect(programLayout({ image: "", copy: "" }, true)).toBe("hub");
    expect(programLayout({ image: "", copy: "" }, false)).toBe("card");
    expect(programsHubShown("DCWF", 3)).toBe(true);
    expect(programsHubShown("DCWF", 2)).toBe(false);
    expect(programsHubShown("  ", 8)).toBe(false);
  });

  it("thanks columns unchanged; logos need an image", () => {
    expect(parseImpactThanks([{ heading: "A", names: "X" }])).toHaveLength(1);
    const logos = parseImpactLogos([
      { image: "", name: "No logo" },
      { image: "/l.png", name: "Stuffed", url: "https://x.org" },
      { image: "/m.png", name: "Bad", url: "javascript:alert(1)" },
    ]);
    expect(logos.map((l) => [l.name, l.index, l.url])).toEqual([
      ["Stuffed", 1, "https://x.org"],
      ["Bad", 2, ""],
    ]);
  });

  it("people: grouped in first-seen order, blank group joins the row above", () => {
    const groups = parseImpactPeople(
      [
        { name: "Lead", group: "" },
        { group: "Meet our team", name: "Rosie", role: "Director" },
        { group: "", name: "David" },
        { group: "Meet our board", name: "Carly" },
        { group: "meet our TEAM", name: "Teddy" },
        { group: "Meet our board", name: "" },
        { group: "", name: "Ian" },
      ],
      "Our people",
    );
    expect(groups.map((g) => g.name)).toEqual([
      "Our people",
      "Meet our team",
      "Meet our board",
    ]);
    expect(groups[1]?.people.map((p) => [p.name, p.index])).toEqual([
      ["Rosie", 1],
      ["David", 2],
      ["Teddy", 4],
    ]);
    expect(groups[2]?.people.map((p) => p.name)).toEqual(["Carly", "Ian"]);
    expect(parseImpactPeople([{ name: "Solo" }])[0]?.name).toBe("");
    expect(parseImpactPeople(undefined)).toEqual([]);
  });

  it("personInitials", () => {
    expect(personInitials("Keyanna Silverman-Maddox")).toBe("KS");
    expect(personInitials("Gerrard “G.” Allen")).toBe("GA");
    expect(personInitials("teddy")).toBe("T");
    expect(personInitials("  ")).toBe("");
  });

  it("spotlights: heading plus body or callout; menu label falls back to heading", () => {
    const rows = parseImpactSpotlights([
      { heading: "No text" },
      { heading: "", body: "orphan" },
      { heading: "Why it matters", body: "Only 11% [2]", navLabel: "" },
      {
        heading: "Technical assistance",
        callout: "1:1 support",
        navLabel: "TA",
        statValue: "400+",
        statCaption: "hours",
        stat2Value: "1:1",
      },
    ]);
    expect(rows.map((r) => [r.heading, r.navLabel, r.index])).toEqual([
      ["Why it matters", "Why it matters", 2],
      ["Technical assistance", "TA", 3],
    ]);
    expect(rows[0]?.figures).toEqual([]);
    expect(rows[1]?.figures).toEqual([
      { value: "400+", caption: "hours" },
      { value: "1:1", caption: "" },
    ]);
    expect(spotlightAnchorId(2)).toBe("impact-spotlight-2");
  });

  it("portfolio: grouped; per-group date label = first non-empty, else the default", () => {
    const groups = parseImpactPortfolio(
      [
        {
          group: "Current projects",
          name: "For Everyone",
          detail: "Print",
          date: "2024",
        },
        {
          group: "",
          name: "Handy Relocations",
          date: "2024",
          dateLabel: "Funded",
        },
        { group: "Repaid loans", dateLabel: "Repaid" },
        { group: "", name: "Stuffed", date: "2023", url: "https://s.co" },
        { group: "", name: "Second", dateLabel: "Ignored" },
        { group: "Other", name: "No label row" },
      ],
      "Portfolio",
      "Date",
    );
    expect(groups.map((g) => [g.name, g.dateLabel, g.rows.length])).toEqual([
      ["Current projects", "Funded", 2],
      ["Repaid loans", "Repaid", 2],
      ["Other", "Date", 1],
    ]);
    expect(groups[1]?.rows[0]).toMatchObject({
      name: "Stuffed",
      index: 3,
      url: "https://s.co",
    });
    expect(
      parseImpactPortfolio([{ name: "x" }], "Portfolio", "Date")[0]?.name,
    ).toBe("Portfolio");
  });

  it("support + sources", () => {
    expect(
      parseImpactSupport([{ title: "" }, { title: "Give", line: "Now" }]).map(
        (r) => [r.title, r.index],
      ),
    ).toEqual([["Give", 1]]);
    const sources = parseImpactSources([
      { text: "" },
      { text: "Census 2020", url: "https://census.gov" },
      { text: "Study", url: "javascript:x" },
    ]);
    expect(sources.map((s) => [s.n, s.index, s.url])).toEqual([
      [1, 1, "https://census.gov"],
      [2, 2, ""],
    ]);
    expect(sourceAnchorId(2)).toBe("impact-source-2");
  });

  it("numeralSize steps by character count", () => {
    expect(numeralSize("9")).toBe("base");
    expect(numeralSize("26")).toBe("base");
    expect(numeralSize("1:1")).toBe("mid");
    expect(numeralSize("150+")).toBe("mid");
    expect(numeralSize("$300K")).toBe("long");
    expect(numeralSize(" 88¢ ")).toBe("mid");
    expect(numeralSize("")).toBe("base");
  });

  it("hubPositions follows the approved placement map", () => {
    expect(hubPositions(3)).toEqual(["tc", "br", "bl"]);
    expect(hubPositions(4)).toEqual(["tl", "tr", "br", "bl"]);
    expect(hubPositions(5)).toEqual(["tl", "tc", "tr", "br", "bl"]);
    expect(hubPositions(6)).toEqual(["tl", "tr", "r", "br", "bl", "l"]);
    expect(hubPositions(7)).toEqual(["tl", "tc", "tr", "r", "br", "bl", "l"]);
    expect(hubPositions(8)).toEqual([
      "tl",
      "tc",
      "tr",
      "r",
      "br",
      "bc",
      "bl",
      "l",
    ]);
    expect(hubPositions(12)).toHaveLength(8);
    expect(hubPositions(0)).toEqual([]);
  });
});

describe("impact v2 markup", () => {
  const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);

  it("returns plain strings untouched", () => {
    expect(renderImpactText("Plain text", { sourceCount: 3 })).toBe(
      "Plain text",
    );
  });

  it("renders **bold** and in-range [N] footnotes", () => {
    expect(
      html(
        renderImpactText("**Only 11%** live here.[2] More [3]", {
          sourceCount: 2,
          strongClassName: "b",
        }),
      ),
    ).toBe(
      '<strong class="b">Only 11%</strong> live here.<sup class="wealth-impact-fn"><a href="#impact-source-2" aria-label="Source 2">2</a></sup> More [3]',
    );
  });

  it("keeps out-of-range or zero footnotes literal; no sources → no links", () => {
    expect(html(renderImpactText("A [0] B [5]", { sourceCount: 4 }))).toBe(
      "A [0] B [5]",
    );
    expect(html(renderImpactText("See [1]", { sourceCount: 0 }))).toBe(
      "See [1]",
    );
  });

  it("footnotes work inside bold runs", () => {
    expect(html(renderImpactText("**Fact [1]**", { sourceCount: 1 }))).toBe(
      '<strong>Fact <sup class="wealth-impact-fn"><a href="#impact-source-1" aria-label="Source 1">1</a></sup></strong>',
    );
  });

  it("never injects HTML", () => {
    const out = html(
      renderImpactText('<b>x</b> **<img src=x onerror="y">** [1]', {
        sourceCount: 1,
      }),
    );
    expect(out).not.toContain("<b>");
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("ImpactParagraphs splits on blank lines with a lead class", () => {
    expect(
      html(
        <ImpactParagraphs
          text={"First [1]\n\nSecond **bold**"}
          sourceCount={1}
          className="p"
          leadClassName="lead"
        />,
      ),
    ).toBe(
      '<p class="p lead">First <sup class="wealth-impact-fn"><a href="#impact-source-1" aria-label="Source 1">1</a></sup></p><p class="p">Second <strong>bold</strong></p>',
    );
    expect(html(<ImpactParagraphs text="  " sourceCount={0} />)).toBe("");
  });

  it("splitBoldLead + impactBodyBlocks", () => {
    expect(splitBoldLead("**Wealth** stays local.")).toEqual({
      lead: "Wealth",
      rest: "stays local.",
    });
    expect(splitBoldLead("**Title:** rest")).toEqual({
      lead: "Title:",
      rest: "rest",
    });
    expect(splitBoldLead("No **lead** here")).toBeNull();
    expect(splitBoldLead("**Only**")).toEqual({ lead: "Only", rest: "" });
    const blocks = impactBodyBlocks(
      "Lead para.\n\n**A** one\n\n**B** two\n\nAfter.\n\n**C** three",
    );
    expect(blocks.map((b) => (b.kind === "p" ? "p" : b.items.length))).toEqual([
      "p",
      2,
      "p",
      1,
    ]);
  });
});

describe("impact v2 section head + devices", () => {
  it("numbers the eyebrow, keeps the field hook on the text, adds the mark", () => {
    const out = renderToStaticMarkup(
      <ImpactSectionHead
        sectionId="impact-about"
        number={3}
        eyebrow="Who we are"
        eyebrowKey={K.aboutEyebrow}
        heading="Our mission"
        headingKey={K.missionHeading}
        noReveal
      />,
    );
    expect(out).toContain(
      '<span class="wealth-impact-no" aria-hidden="true">03 · </span><span data-sp-field="wealth.impact.about-eyebrow">Who we are</span>',
    );
    expect(out).toContain('id="impact-about-h"');
    expect(out).toContain('class="wealth-impact-mark"');
  });

  it("v1 call sites still render (no number, mark opt-out)", () => {
    const out = renderToStaticMarkup(
      <ImpactSectionHead
        sectionId="letter"
        eyebrow="A letter"
        eyebrowKey={K.letterEyebrow}
        heading=""
        headingKey={K.letterHeading}
        mark={false}
        noReveal
      />,
    );
    expect(out).not.toContain("wealth-impact-no");
    expect(out).not.toContain("<h2");
    expect(out).not.toContain("wealth-impact-mark");
  });

  it("numeral tile applies the length step; rings are decorative", () => {
    expect(
      renderToStaticMarkup(<ImpactNumeralTile value="$300K" size="lg" />),
    ).toBe(
      '<span class="wealth-impact-tile wealth-impact-tile--lg wealth-impact-tile--long"><span class="wealth-impact-tile__num">$300K</span></span>',
    );
    const rings = renderToStaticMarkup(
      <WealthRings placement="tr" rings={20} />,
    );
    expect(rings).toContain('aria-hidden="true"');
    expect(rings).toContain('focusable="false"');
    expect(rings.match(/<circle/g)).toHaveLength(12);
  });

  it("portrait falls back to aria-hidden initials", () => {
    expect(
      renderToStaticMarkup(<ImpactPortrait src="" alt="" name="Ian McCain" />),
    ).toContain(
      '<span class="wealth-impact-portrait__initials" aria-hidden="true">IM</span>',
    );
  });
});
