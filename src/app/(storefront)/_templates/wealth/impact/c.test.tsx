import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { ImpactFields } from "./wealth-impact-head";

import {
  parseImpactPrograms,
  parseImpactSpotlights,
  parseImpactStats,
} from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import {
  hubConnectors,
  planImpactPrograms,
  programAnchorId,
} from "./wealth-impact-hub";
import { WealthImpactNumbers } from "./wealth-impact-numbers";
import {
  programCardEyebrow,
  programSegments,
  WealthImpactPrograms,
} from "./wealth-impact-programs";
import {
  spotlightLayout,
  spotlightLead,
  spotlightTone,
  WealthImpactSpotlight,
} from "./wealth-impact-spotlights";

const programRows = [
  { title: "Worker Owned Detroit", short: "WOD", copy: "Copy one." },
  { title: "Incubator", short: "CIP", copy: "Copy two.", image: "/a.jpg" },
  { title: "CEND", short: "CEND" },
  { title: "Shared Leadership", copy: "Copy three." },
  { title: "Technical Assistance" },
];

const fields = (extra: ImpactFields = {}): ImpactFields => ({
  [K.programsEyebrow]: "Programs",
  [K.programsHeading]: "What we are solving",
  [K.programsHubHeading]: "Organization overview",
  [K.numbersEyebrow]: "By the numbers",
  [K.numbersHeading]: "2024 Impact",
  ...extra,
});

describe("planImpactPrograms", () => {
  const programs = parseImpactPrograms(programRows);

  it("numbers only card/row programs, in order, when the hub shows", () => {
    const plan = planImpactPrograms(programs, true);
    expect(plan.map((e) => [e.layout, e.n])).toEqual([
      ["card", 1],
      ["row", 2],
      ["hub", null],
      ["card", 3],
      ["hub", null],
    ]);
  });

  it("falls back to cards for title-only programs without the hub", () => {
    const plan = planImpactPrograms(programs, false);
    expect(plan.map((e) => e.n)).toEqual([1, 2, 3, 4, 5]);
    expect(plan[2]?.layout).toBe("card");
  });

  it("groups consecutive cards into one segment", () => {
    const segs = programSegments(planImpactPrograms(programs, false));
    expect(segs.map((s) => s.kind)).toEqual(["cards", "row", "cards"]);
    const last = segs[2];
    expect(last?.kind === "cards" ? last.entries.length : 0).toBe(3);
  });

  it("builds the card eyebrow from label, else number + short", () => {
    const [wod] = programs;
    expect(wod && programCardEyebrow(wod, 1)).toBe("01 · WOD");
    expect(wod && programCardEyebrow({ ...wod, short: "" }, 4)).toBe("04");
    expect(wod && programCardEyebrow({ ...wod, label: "Lending" }, 4)).toBe(
      "Lending",
    );
  });
});

describe("hubConnectors", () => {
  it("runs from the hub edge to the facing tile edge in a 300 viewBox", () => {
    const [tl, r] = hubConnectors(["tl", "r"]);
    expect(tl).toMatchObject({ x1: 114, y1: 114, x2: 86, y2: 86 });
    expect(r).toMatchObject({ x1: 186, y1: 150, x2: 214, y2: 150 });
  });
});

describe("WealthImpactPrograms", () => {
  const programs = parseImpactPrograms(programRows);

  it("renders the hub + list in one section group when the hub shows", () => {
    const html = renderToStaticMarkup(
      <WealthImpactPrograms
        f={fields({ [K.programsHubLabel]: "DCWF" })}
        programs={programs}
        number={5}
      />,
    );
    expect(html.match(/data-sp-group="impact.programs"/g)).toHaveLength(1);
    expect(html).toContain('aria-labelledby="programs-h"');
    expect(html).toContain("wealth-on-sage");
    expect(html).toContain('aria-labelledby="programs-hub-label"');
    // linked tiles only for rendered programs
    expect(html).toContain(`href="#${programAnchorId(1)}"`);
    expect(html).toContain(`href="#${programAnchorId(3)}"`);
    expect(html).not.toContain(`href="#${programAnchorId(4)}"`);
    expect(html).toContain(`id="${programAnchorId(2)}"`);
    // hub-only programs do not render as cards
    expect(html).not.toContain(">Technical Assistance</h3>");
    expect(html).toContain("05 · ");
    expect(html.match(/<line /g)).toHaveLength(5);
  });

  it("renders a single paper section without the hub", () => {
    const html = renderToStaticMarkup(
      <WealthImpactPrograms f={fields()} programs={programs} number={5} />,
    );
    expect(html).not.toContain("wealth-impact-hub");
    expect(html).toContain(">Technical Assistance</h3>");
    expect(html).toContain(`id="${programAnchorId(5)}"`);
  });
});

describe("WealthImpactNumbers", () => {
  it("uses ledger rows (no bg photo) once any figure has a detail", () => {
    const stats = parseImpactStats([
      {
        value: "9",
        caption: "Co-ops funded",
        title: "Dev",
        detail: "Since [1].",
      },
      { value: "$300K", caption: "Invested" },
    ]);
    const html = renderToStaticMarkup(
      <WealthImpactNumbers
        f={fields({ [K.numbersBgImage]: "/bg.jpg" })}
        stats={stats}
        financialsId={null}
        number={6}
        sourceCount={1}
      />,
    );
    expect(html).toContain("wealth-impact-ledger__row");
    expect(html).toContain("wealth-impact-tile--long");
    expect(html).toContain('href="#impact-source-1"');
    expect(html).not.toContain("bg.jpg");
    expect(html).toContain("wealth-impact-rings--tr");
  });

  it("keeps the grid + faint photo without details", () => {
    const stats = parseImpactStats([{ value: "9", caption: "Co-ops" }]);
    const html = renderToStaticMarkup(
      <WealthImpactNumbers
        f={fields({ [K.numbersBgImage]: "/bg.jpg" })}
        stats={stats}
        financialsId={null}
      />,
    );
    expect(html).toContain("wealth-stats--grid");
    expect(html).toContain("bg.jpg");
  });
});

describe("spotlights", () => {
  const [figs, photo, facts] = parseImpactSpotlights([
    {
      eyebrow: "Spotlight",
      heading: "Technical assistance",
      body: "Lead para.\n\n**Asset Based** One.\n\n**Trust** Two [1].",
      statValue: "400+",
      statCaption: "Hours",
      image: "/x.jpg",
    },
    { heading: "Photo one", body: "Body.", image: "/p.jpg", imageAlt: "A" },
    {
      eyebrow: "Spotlight",
      heading: "Why it matters",
      body: "Fact one.\n\nFact two.",
      callout: "Call [1].",
    },
  ]);

  it("picks the layout and tone", () => {
    expect(figs && spotlightLayout(figs)).toBe("figures");
    expect(photo && spotlightLayout(photo)).toBe("photo");
    expect(facts && spotlightLayout(facts)).toBe("facts");
    expect([1, 2, 3].map(spotlightTone)).toEqual([
      "surface",
      "paper",
      "surface",
    ]);
    expect(spotlightLead([{ kind: "p", text: "a" }]).lead).toBe("a");
  });

  it("renders the figures layout with tiles, lead and points", () => {
    if (!figs) throw new Error("no row");
    const html = renderToStaticMarkup(
      <WealthImpactSpotlight
        spotlight={figs}
        n={2}
        number={8}
        sourceCount={1}
      />,
    );
    expect(html).toContain('id="impact-spotlight-2"');
    expect(html).toContain('data-sp-group="impact.spotlights"');
    expect(html).toContain('data-sp-item="wealth.impact.spotlights-items#0"');
    expect(html).toContain("wealth-on-paper");
    expect(html).toContain("wealth-impact-tile--lg");
    expect(html).toContain("wealth-impact-spot__lead");
    expect(html.match(/wealth-impact-point__title/g)).toHaveLength(2);
    expect(html).not.toContain("x.jpg");
    expect(html).toContain("08 · ");
  });

  it("renders the facts layout with a callout and footnotes", () => {
    if (!facts) throw new Error("no row");
    const html = renderToStaticMarkup(
      <WealthImpactSpotlight
        spotlight={facts}
        n={1}
        sourceCount={1}
        tone="surface"
      />,
    );
    expect(html).toContain("wealth-impact-spot--facts");
    expect(html).toContain("wealth-impact-callout");
    expect(html).toContain('href="#impact-source-1"');
  });

  it("renders the photo layout as a half-bleed split", () => {
    if (!photo) throw new Error("no row");
    const html = renderToStaticMarkup(
      <WealthImpactSpotlight spotlight={photo} n={3} sourceCount={0} />,
    );
    expect(html).toContain("wealth-impact-bleed--right");
    expect(html).toContain('alt="A"');
  });
});
