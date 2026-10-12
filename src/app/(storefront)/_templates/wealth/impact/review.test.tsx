import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { WEALTH_IMPACT_KEYS as K } from "./index";
import { WealthImpactHero } from "./wealth-impact-hero";
import { WealthImpactNav } from "./wealth-impact-nav";
import { WealthImpactPage } from "./wealth-impact-page";
import { impactLogoLabel, WealthImpactThanks } from "./wealth-impact-thanks";

// Same harness as page.test.tsx: no Prisma, every feature flag on.
vi.mock("~/server/db", () => {
  const model = new Proxy({}, { get: () => async () => [] }) as Record<
    string,
    unknown
  >;
  return { db: new Proxy({}, { get: () => model }) };
});
vi.mock("~/lib/features/get-business-flags", () => ({
  getBusinessFlags: vi.fn(async () => ({
    flags: new Set<string>(),
    isEnabled: () => true,
    disabledByDependency: new Set<string>(),
  })),
}));

type PageProps = Parameters<typeof WealthImpactPage>[0];

async function page(customFields: Record<string, unknown>): Promise<string> {
  return renderToStaticMarkup(
    await WealthImpactPage({
      business: { name: "X", siteContent: { customFields, logoUrl: "" } },
      page: {
        title: "Impact",
        content: { type: "doc", content: [{ type: "paragraph" }] },
      },
    } as unknown as PageProps),
  );
}

const groups = (out: string) =>
  [...out.matchAll(/data-sp-group="([^"]+)"/g)].map((m) => m[1]);

describe("logo wall accessible names", () => {
  it("uses the owner's name, else the link host, else the path", () => {
    expect(impactLogoLabel("Stuffed Detroit", "https://x.org")).toBe(
      "Stuffed Detroit",
    );
    expect(impactLogoLabel("", "https://www.example.org/a?b=1")).toBe(
      "example.org",
    );
    expect(impactLogoLabel("", "/about")).toBe("about");
    // Unlinked + unnamed = decorative.
    expect(impactLogoLabel("", "")).toBe("");
  });

  it("a linked logo with no name never renders an empty link", () => {
    const out = renderToStaticMarkup(
      <WealthImpactThanks
        f={{}}
        columns={[]}
        logos={[
          {
            id: "a",
            index: 0,
            image: "/l.png",
            name: "",
            url: "https://ex.org",
          },
        ]}
      />,
    );
    expect(out).toContain('alt="ex.org"');
  });
});

describe("cover PDF link is route-checked", () => {
  const f = {
    [K.heroPdfUrl]: "/donate",
    [K.heroPdfLabel]: "Download the PDF",
  };
  const base = { f, logoUrl: "", pageTitle: "Impact", firstSectionId: null };

  it("renders the checked href, and nothing when it was blanked", () => {
    const on = renderToStaticMarkup(
      <WealthImpactHero {...base} pdfHref="/donate" />,
    );
    expect(on).toContain('href="/donate"');
    const off = renderToStaticMarkup(<WealthImpactHero {...base} pdfHref="" />);
    expect(off).not.toContain("Download the PDF");
  });
});

describe("section menu clicks", () => {
  it("leaves new-tab / modified clicks to the browser", () => {
    const target = document.createElement("section");
    target.id = "letter";
    target.tabIndex = -1;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    document.body.append(target);
    render(
      <WealthImpactNav
        label="2025"
        links={[
          { id: "letter", label: "Letter" },
          { id: "numbers", label: "Numbers" },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: "Letter" });

    // ctrl-click: not intercepted (default stays), no smooth scroll.
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true);
    expect(scrollIntoView).not.toHaveBeenCalled();

    // plain click: intercepted and scrolled.
    expect(fireEvent.click(link)).toBe(false);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    target.remove();
  });
});

describe("partial and malformed data", () => {
  it("never throws on junk list rows or non-array lists", async () => {
    const lists = Object.values(K).filter(
      (k) => k.endsWith("-items") || k.endsWith("-logos"),
    );
    const junk = [
      null,
      5,
      "x",
      [],
      { name: 123, title: {}, value: 1, text: null, heading: [], image: 5 },
    ];
    for (const value of [junk, "not-an-array", {}, 7]) {
      const out = await page(Object.fromEntries(lists.map((k) => [k, value])));
      expect(out.match(/<h1/g)).toHaveLength(1);
      expect(groups(out)).toEqual(["impact.hero", "impact.cta"]);
    }
  });

  it("spotlight with only a heading and a callout renders sanely", async () => {
    const out = await page({
      [K.spotlightsItems]: [{ heading: "Why", callout: "Co-ops keep wealth." }],
    });
    expect(out).toContain('id="impact-spotlight-1"');
    expect(out).toContain("Co-ops keep wealth.");
    expect(out.match(/<h2[^>]*id="impact-spotlight-1-h"/g)).toHaveLength(1);
  });

  it("portfolio groups with no date or no industry drop the column", async () => {
    const out = await page({
      [K.portfolioItems]: [
        { group: "A", name: "n1" },
        { name: "n2" },
        { group: "B", name: "n3", date: "2020" },
      ],
    });
    const tables = out.split("<table").slice(1);
    expect(tables).toHaveLength(2);
    // Table A: name only. Table B: name + date, no industry column.
    expect(tables[0]).not.toContain("Industry");
    expect(tables[0]).not.toContain("wealth-impact-table__date");
    expect(tables[1]).toContain("wealth-impact-table__date");
    expect(tables[1]).not.toContain("Industry");
  });

  it("one person in a group", async () => {
    const out = await page({
      [K.peopleItems]: [{ group: "Meet our team", name: "Solo Person" }],
    });
    expect(out).toContain("Solo Person");
    expect(out.match(/<h3[^>]*>Meet our team<\/h3>/g)).toHaveLength(1);
    expect(out).not.toContain("wealth-impact-people__grid--4");
  });

  it("hub with exactly three programs uses the 3-tile map (tc, br, bl)", async () => {
    const out = await page({
      [K.programsHubLabel]: "HUB",
      [K.programsItems]: [
        { title: "A", short: "AA" },
        { title: "B", copy: "x" },
        { title: "C", image: "/c.jpg" },
      ],
    });
    expect([...out.matchAll(/data-pos="([a-z]+)"/g)].map((m) => m[1])).toEqual([
      "tc",
      "br",
      "bl",
    ]);
    // Only the rows that render below are links.
    expect(out).toContain('href="#impact-program-1"');
    expect(out).toContain('href="#impact-program-2"');
    expect(out).toContain('id="impact-program-1"');
    expect(out).toContain('id="impact-program-2"');
    expect(out).not.toContain("impact-program-3");
  });

  it("ledger: only one figure has a detail", async () => {
    const out = await page({
      [K.numbersItems]: [
        { value: "9", caption: "co-ops" },
        { value: "$300K", caption: "lent", title: "Lent", detail: "Detail." },
      ],
    });
    expect(out).toContain("wealth-impact-ledger__row");
    expect(out.match(/wealth-impact-ledger__row/g)).toHaveLength(2);
    expect(out.match(/<h3[^>]*wealth-impact-ledger__title/g)).toHaveLength(1);
    // numeral length steps: "9" base, "$300K" long
    expect(out).toContain("wealth-impact-tile--long");
  });
});

describe("ways to support", () => {
  it("shows with only a closing line, and hides with nothing", async () => {
    const closing = await page({ [K.supportClosing]: "**Give** today." });
    expect(groups(closing)).toContain("impact.support");
    expect(closing).toContain("<strong>Give</strong> today.");
    const none = await page({ [K.supportButtonLabel]: "Contact us" });
    expect(groups(none)).not.toContain("impact.support");
  });
});
