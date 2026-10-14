import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WEALTH_IMPACT_KEYS as K } from "./index";
import { WealthImpactPage } from "./wealth-impact-page";

// Keep Prisma (and its field-encryption setup) out of the render. Modules
// pulled in transitively (auth config) may query at import time: every model
// answers with empty results.
vi.mock("~/server/db", () => {
  const model = new Proxy({}, { get: () => async () => [] }) as Record<
    string,
    unknown
  >;
  return { db: new Proxy({}, { get: () => model }) };
});

// The page reads feature flags from the tenant (headers + DB); every flag on.
vi.mock("~/lib/features/get-business-flags", () => ({
  getBusinessFlags: vi.fn(async () => ({
    flags: new Set<string>(),
    isEnabled: () => true,
    disabledByDependency: new Set<string>(),
  })),
}));

type PageProps = Parameters<typeof WealthImpactPage>[0];

function props(
  customFields: Record<string, unknown>,
  content: unknown = { type: "doc", content: [{ type: "paragraph" }] },
): PageProps {
  return {
    business: {
      name: "Detroit Community Wealth Fund",
      siteContent: { customFields, logoUrl: "" },
    },
    page: { title: "Impact Report", content },
  } as unknown as PageProps;
}

async function render(p: PageProps): Promise<string> {
  return renderToStaticMarkup(await WealthImpactPage(p));
}

const count = (s: string, needle: string) => s.split(needle).length - 1;

const embed = JSON.stringify({
  src: "https://www.canva.com/design/abc/view?embed",
  title: "2024 Impact Report",
});

const FULL: Record<string, unknown> = {
  [K.heroImage]: "/cover.jpg",
  [K.heroImageAlt]: "Members at the garden",
  [K.heroPdfUrl]: "https://example.org/report.pdf",
  [K.letterBody]: "A big year.[1]\n\nSecond paragraph [9].",
  [K.letterName]: "Keyanna Silverman-Maddox",
  [K.letterRole]: "Executive Director",
  [K.missionBody]: "Our mission statement.",
  [K.historyBody]: "Founded in 2017.[2]",
  [K.peopleItems]: [
    { group: "Meet our team", name: "Rosie DeSantis", role: "Director" },
    { group: "Meet our board", name: "Ian McCain" },
  ],
  [K.programsHubLabel]: "DCWF",
  [K.programsItems]: [
    { title: "Cooperative Incubator", short: "CIP", copy: "Twelve weeks." },
    { title: "Worker-Owned Detroit", short: "WOD", copy: "Advocacy." },
    { title: "Loan fund", short: "NEF" },
  ],
  [K.numbersItems]: [
    { value: "9", caption: "co-ops", title: "Incubated", detail: "Nine [1]" },
    { value: "$300K", caption: "lent" },
  ],
  [K.spotlightsItems]: [
    {
      navLabel: "Why It Matters",
      eyebrow: "Spotlight",
      heading: "Why worker ownership",
      body: "Only 11% live and work here.[2]",
      callout: "Co-ops keep wealth local.",
    },
    {
      eyebrow: "Spotlight",
      heading: "Technical assistance",
      body: "**One on one** coaching.",
      statValue: "400+",
      statCaption: "hours",
    },
  ],
  [K.portfolioItems]: [
    { group: "Current projects", name: "For Everyone", detail: "Print" },
    { group: "Repaid loans", name: "Stuffed", date: "2023" },
  ],
  [K.storiesItems]: [{ name: "Handy Relocations", summary: "Movers." }],
  [K.goalsItems]: [{ title: "Grow the Incubator", line: "More co-ops." }],
  [K.financialsItems]: [
    { group: "Revenue", label: "Grants", amount: "$612,000", share: "60" },
  ],
  [K.thanksItems]: [{ heading: "Funders", names: "A Foundation" }],
  [K.thanksLogos]: [{ image: "/logo.png", name: "Stuffed Detroit" }],
  [K.reportEmbedUrl]: embed,
  [K.supportItems]: [{ title: "Direct contributions", line: "Give now." }],
  [K.sourcesItems]: [
    { text: "Census 2020", url: "https://census.gov" },
    { text: "Detroit Future City, 2023" },
  ],
  [K.pastItems]: [{ label: "2023 Impact Report", url: "/r/2023.pdf" }],
};

const ORDER = [
  "impact.hero",
  "impact.letter",
  "impact.about",
  "impact.people",
  "impact.programs",
  "impact.numbers",
  "impact.spotlights",
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
];

/** Section-root `data-sp-group`s in document order (the first per section). */
function groupOrder(out: string): string[] {
  const seen: string[] = [];
  for (const m of out.matchAll(/<(section|div)[^>]*data-sp-group="([^"]+)"/g)) {
    const g = m[2] ?? "";
    // Programs nests no other group; spotlights repeat by design.
    if (seen[seen.length - 1] !== g || g === "impact.spotlights") seen.push(g);
  }
  return seen;
}

describe("WealthImpactPage (v2) server render", () => {
  it("full data: one h1, render order, menu, numbering, footnotes", async () => {
    const out = await render(props(FULL));

    expect(count(out, "<h1")).toBe(1);

    // Every section root in spec order. Spotlights come one per row, and
    // each row also carries its own list-item hook.
    const groups = [...out.matchAll(/data-sp-group="([^"]+)"/g)].map(
      (m) => m[1],
    );
    const firstSeen = groups.filter((g, i) => groups.indexOf(g) === i);
    expect(firstSeen).toEqual([...new Set(ORDER)]);
    expect(count(out, 'data-sp-group="impact.spotlights"')).toBe(2);
    expect(groupOrder(out)).toEqual(ORDER);

    // Menu: every visible section, one entry per spotlight.
    const nav = /<nav[^>]*aria-label="Report sections"[\s\S]*?<\/nav>/.exec(
      out,
    )?.[0];
    expect(nav).toBeDefined();
    const hrefs = [...(nav ?? "").matchAll(/href="#([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(hrefs).toEqual([
      "letter",
      "impact-about",
      "impact-people",
      "programs",
      "numbers",
      "impact-spotlight-1",
      "impact-spotlight-2",
      "impact-portfolio",
      "stories",
      "goals",
      "financials",
      "thanks",
      "impact-report",
      "impact-support",
      "impact-sources",
      "past-reports",
    ]);
    expect(nav).toContain(">Why It Matters<");
    // A spotlight without its own label falls back to its heading.
    expect(nav).toContain(">Technical assistance<");
    // Step buttons ship hidden; the client shows them only on overflow.
    expect(count(nav ?? "", 'class="wealth-impact-nav__step"')).toBe(2);
    expect(nav).toContain('aria-label="Scroll section menu left"');

    // Every anchor in the menu exists on the page.
    for (const id of hrefs) expect(out).toContain(`id="${id}"`);

    // Numbering: the cover is 01, so sections run 02 … 17 in order.
    const numbers = [
      ...out.matchAll(/class="wealth-impact-no"[^>]*>(\d+) · </g),
    ].map((m) => Number(m[1]));
    expect(numbers).toEqual(
      Array.from({ length: hrefs.length }, (_, i) => i + 2),
    );
    expect(out).toMatch(
      /class="wealth-impact-no"[^>]*>02 · <\/span><span data-sp-field="wealth\.impact\.letter-eyebrow"/,
    );

    // Footnotes link only to sources that exist; [9] stays literal.
    const targets = [...out.matchAll(/href="#impact-source-(\d+)"/g)].map((m) =>
      Number(m[1]),
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const n of targets) {
      expect(n).toBeLessThanOrEqual(2);
      expect(out).toContain(`id="impact-source-${n}"`);
    }
    expect(out).toContain("Second paragraph [9].");

    // Report embed + route-checked PDF button.
    expect(out).toContain('id="impact-report"');
    expect(out).toContain('href="https://example.org/report.pdf"');

    // Ids are unique, and "Read the report" jumps to the first section.
    const ids = [...out.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(out).toContain('href="#letter"');

    // Token-only output: no hex colours anywhere in the markup.
    expect(out).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?!-)/);
  });

  it("hiding Sources turns every [N] back into text", async () => {
    const out = await render(
      props({
        ...FULL,
        _sp: { sections: { "impact.sources": { hidden: true } } },
      }),
    );
    expect(out).not.toContain('href="#impact-source-');
    expect(out).not.toContain('id="impact-sources"');
    expect(out).toContain("A big year.[1]");
  });

  it("no data: only the cover and the donate band", async () => {
    const out = await render(props({}));
    expect(count(out, "<h1")).toBe(1);
    expect(groupOrder(out)).toEqual(["impact.hero", "impact.cta"]);
    expect(out).not.toContain('aria-label="Report sections"');
    expect(out).not.toContain("wealth-impact-no");
    expect(out).not.toContain('href="#impact-source-');
    expect(out).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?!-)/);
  });

  it("one section: no menu, and it is numbered 02", async () => {
    const out = await render(props({ [K.supportItems]: [{ title: "Give" }] }));
    expect(out).not.toContain('aria-label="Report sections"');
    expect(out).toMatch(/class="wealth-impact-no"[^>]*>02 · </);
  });
});
