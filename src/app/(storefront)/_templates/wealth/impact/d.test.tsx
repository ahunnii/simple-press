import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  parseImpactGoals,
  parseImpactLogos,
  parseImpactPortfolio,
  parseImpactSources,
  parseImpactSupport,
  parseImpactThanks,
} from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { WealthImpactGoals } from "./wealth-impact-goals";
import { WealthImpactPortfolio } from "./wealth-impact-portfolio";
import {
  hasImpactReportEmbed,
  WealthImpactReport,
} from "./wealth-impact-report";
import { WealthImpactSources } from "./wealth-impact-sources";
import { WealthImpactSupport } from "./wealth-impact-support";
import { hasImpactThanks, WealthImpactThanks } from "./wealth-impact-thanks";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("portfolio", () => {
  const rows = [
    {
      group: "Current",
      name: "Alpha",
      detail: "Moving",
      date: "Feb 2025",
      dateLabel: "Funded",
      url: "https://example.com/a",
    },
    { name: "Beta", detail: "Retail", date: "Jan 2024" },
    {
      group: "Repaid",
      name: "Gamma",
      detail: "",
      date: "Aug 2018",
      dateLabel: "Repaid",
    },
  ];
  const groups = parseImpactPortfolio(rows, "", "Date");
  const out = html(
    <WealthImpactPortfolio
      f={{
        [K.portfolioHeading]: "Where",
        [K.portfolioDetailLabel]: "Industry",
        [K.portfolioIntro]: "Intro",
      }}
      number={9}
      groups={groups}
    />,
  );

  it("renders one real table per group with a caption and scoped headers", () => {
    expect(out.match(/<table/g)).toHaveLength(2);
    expect(out.match(/<caption class="sr-only">/g)).toHaveLength(2);
    expect(out).toContain(
      '<th scope="col" role="columnheader" class="wealth-impact-table__group">Current</th>',
    );
    expect(out).toContain('<th scope="row" role="rowheader">');
    // Explicit roles survive the phone layout's display:block (Safari/VO).
    expect(out).toContain('<table role="table"');
    expect(out).toContain('<tbody role="rowgroup">');
    expect(out).toContain('<td role="cell">');
    expect(out).toContain(">Funded</th>");
    expect(out).toContain(">Repaid</th>");
  });

  it("links the name in a new tab with a screen-reader note", () => {
    expect(out).toContain('target="_blank"');
    expect(out).toContain("(opens in new tab)");
    expect(out).toContain("Alpha");
  });

  it("drops a column that has no values in a group", () => {
    const repaid = out.split("<table")[2] ?? "";
    expect(repaid).not.toContain("Industry");
    expect(repaid).toContain("Aug 2018");
  });
});

describe("goals", () => {
  const goals = parseImpactGoals([
    { title: "Prevent loss", line: "by converting." },
    { title: "Build future" },
  ]);
  it("no image and no intro: wide box, no bleed", () => {
    const out = html(
      <WealthImpactGoals f={{ [K.goalsHeading]: "Goals" }} goals={goals} />,
    );
    expect(out).toContain("wealth-impact-goalbox--wide");
    expect(out).not.toContain("wealth-impact-bleed");
    expect(out).toContain("01");
    expect(out).not.toContain("goalbox__label");
  });
  it("image: half-bleed left, label + footnoted intro", () => {
    const out = html(
      <WealthImpactGoals
        f={{
          [K.goalsHeading]: "Goals",
          [K.goalsImage]: "https://example.com/p.jpg",
          [K.goalsImageAlt]: "A member",
          [K.goalsIntro]: "Claim.[1]",
          [K.goalsListLabel]: "Needed now:",
        }}
        goals={goals}
        sourceCount={1}
      />,
    );
    expect(out).toContain("wealth-impact-bleed--left");
    expect(out).not.toContain("goalbox--wide");
    expect(out).toContain('alt="A member"');
    expect(out).toContain('href="#impact-source-1"');
    expect(out).toContain("Needed now:");
    expect(out).toContain('aria-labelledby="goals-list-label"');
  });
});

describe("thanks", () => {
  const columns = parseImpactThanks([{ heading: "Donors", names: "A\nB" }]);
  const logos = parseImpactLogos([
    {
      image: "https://example.com/a.png",
      name: "Alpha Fund",
      url: "https://alpha.example",
    },
    { image: "https://example.com/b.png", name: "Beta Fund" },
  ]);
  it("hasImpactThanks: columns OR logos", () => {
    expect(hasImpactThanks({ columns: [], logos: [] })).toBe(false);
    expect(hasImpactThanks({ columns, logos: [] })).toBe(true);
    expect(hasImpactThanks({ columns: [], logos })).toBe(true);
  });
  it("logo wall: linked cell is an anchor, unlinked is a figure", () => {
    const out = html(
      <WealthImpactThanks
        f={{ [K.thanksHeading]: "Thanks" }}
        columns={[]}
        logos={logos}
      />,
    );
    expect(out).toContain('<a href="https://alpha.example"');
    expect(out).toContain("<figure");
    expect(out).toContain('alt="Alpha Fund"');
    expect(out).toContain('aria-labelledby="thanks-h"');
  });
  it("renders the framed photo and name columns above the wall", () => {
    const out = html(
      <WealthImpactThanks
        f={{
          [K.thanksHeading]: "Thanks",
          [K.thanksImage]: "https://example.com/g.jpg",
          [K.thanksImageAlt]: "Group",
        }}
        columns={columns}
        logos={logos}
      />,
    );
    expect(out).toContain("wealth-impact-frame");
    expect(out.indexOf("Donors")).toBeLessThan(
      out.indexOf("wealth-impact-logos"),
    );
  });
});

describe("report", () => {
  const embed = JSON.stringify({
    src: "https://www.canva.com/design/x/view?embed",
    height: 600,
    title: "Report",
  });
  it("hasImpactReportEmbed validates the iframe value", () => {
    expect(hasImpactReportEmbed({})).toBe(false);
    expect(hasImpactReportEmbed({ [K.reportEmbedUrl]: "not json" })).toBe(
      false,
    );
    expect(hasImpactReportEmbed({ [K.reportEmbedUrl]: embed })).toBe(true);
  });
  it("renders the frame and the pdf button when both pdf fields are set", () => {
    const f = {
      [K.reportEmbedUrl]: embed,
      [K.reportHeading]: "Read",
      [K.heroPdfUrl]: "https://example.com/r.pdf",
      [K.heroPdfLabel]: "Download the PDF",
    };
    const out = html(<WealthImpactReport f={f} />);
    expect(out).toContain("wealth-impact-embed__frame");
    expect(out).toContain("Download the PDF");
    expect(
      html(<WealthImpactReport f={{ ...f, [K.heroPdfLabel]: "" }} />),
    ).not.toContain("wealth-btn-ledge");
  });
  it("renders nothing without a valid embed", () => {
    expect(html(<WealthImpactReport f={{}} />)).toBe("");
  });
});

describe("support", () => {
  const ways = parseImpactSupport([
    { title: "Give", line: "Fund us" },
    { title: "Volunteer" },
  ]);
  const f = {
    [K.supportHeading]: "Support",
    [K.supportClosing]: "**Act now.** Rest.",
    [K.supportButtonLabel]: "Contact",
  };
  it("numbered ol, bold closing, button only with an href", () => {
    const out = html(
      <WealthImpactSupport f={f} ways={ways} buttonHref="/contact" />,
    );
    expect(out).toContain("<ol");
    expect(out).toContain("<strong>Act now.</strong>");
    expect(out).toContain('href="/contact"');
    expect(
      html(<WealthImpactSupport f={f} ways={ways} buttonHref={null} />),
    ).not.toContain("Contact");
  });
  it("image → half-bleed right; no image → two-column grid", () => {
    const img = html(
      <WealthImpactSupport
        f={{ ...f, [K.supportImage]: "https://example.com/s.jpg" }}
        ways={ways}
      />,
    );
    expect(img).toContain("wealth-impact-bleed--right");
    expect(img).not.toContain("ways--grid");
    const none = html(<WealthImpactSupport f={f} ways={ways} />);
    expect(none).toContain("wealth-impact-ways--grid");
    expect(none).not.toContain("wealth-impact-bleed");
  });
});

describe("sources", () => {
  it("each li has the footnote anchor id, tabindex -1 and an optional link", () => {
    const sources = parseImpactSources([
      { text: "First", url: "https://example.com/1" },
      { text: "Second" },
    ]);
    const out = html(
      <WealthImpactSources
        f={{ [K.sourcesHeading]: "Cited", [K.sourcesNavLabel]: "Sources" }}
        sources={sources}
        number={16}
      />,
    );
    expect(out).toContain('id="impact-source-1"');
    expect(out).toContain('id="impact-source-2"');
    expect(out.match(/tabindex="-1"/gi)?.length).toBeGreaterThanOrEqual(2);
    expect(out).toContain('target="_blank"');
    expect(out).toContain("<ol");
  });
});
