import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseImpactPeople } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { hasImpactAbout, WealthImpactAbout } from "./wealth-impact-about";
import { WealthImpactHero } from "./wealth-impact-hero";
import { hasImpactLetter, WealthImpactLetter } from "./wealth-impact-letter";
import { WealthImpactPeople } from "./wealth-impact-people";

const html = (node: React.ReactNode) => renderToStaticMarkup(<>{node}</>);
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe("impact v2 B · cover", () => {
  const base = {
    logoUrl: "",
    pageTitle: "Impact",
    firstSectionId: "letter",
  };
  it("renders one h1 with year + theme, running line, deck and CTAs", () => {
    const out = html(
      <WealthImpactHero
        {...base}
        f={{
          [K.heroEyebrow]: "Impact report",
          [K.heroPeriod]: "Jan - Dec",
          [K.heroYear]: "2024",
          [K.heroTheme]: "Our year",
          [K.heroDeck]: "A deck",
          [K.heroButtonLabel]: "Read the report",
          [K.heroPdfUrl]: "/r.pdf",
          [K.heroPdfLabel]: "Download PDF",
        }}
      />,
    );
    expect(count(out, "<h1")).toBe(1);
    expect(out).toContain("Our year");
    expect(out).toContain("wealth-impact-running__rule");
    expect(out).toContain('href="#letter"');
    expect(out).toContain("Download PDF");
    expect(out).toContain("wealth-impact-rings--cover");
  });
  it("falls back to the page title, hides READ without a section, and is full-width with no photo", () => {
    const out = html(
      <WealthImpactHero
        {...base}
        firstSectionId={null}
        f={{ [K.heroButtonLabel]: "Read the report" }}
      />,
    );
    expect(out).toContain(">Impact<");
    expect(out).not.toContain("Read the report");
    expect(out).not.toContain("wealth-impact-running");
    expect(out).toContain("wealth-impact-cover--nophoto");
    expect(out).toContain("wealth-impact-rings--cover");
  });
  it("frames the photo in full colour (no tint)", () => {
    const out = html(
      <WealthImpactHero
        {...base}
        f={{ [K.heroImage]: "/cover.jpg", [K.heroImageAlt]: "People" }}
      />,
    );
    expect(out).toContain("wealth-impact-frame");
    expect(out).not.toContain("wealth-photo--tint");
    expect(out).toContain('alt="People"');
  });
});

describe("impact v2 B · letter", () => {
  const body = "Lead paragraph.\n\nSecond one.[1]";
  it("hasImpactLetter needs body text", () => {
    expect(hasImpactLetter({})).toBe(false);
    expect(hasImpactLetter({ [K.letterBody]: "  " })).toBe(false);
    expect(hasImpactLetter({ [K.letterBody]: "Hi" })).toBe(true);
  });
  it("first paragraph is the lead; footnotes link when the source exists", () => {
    const f = {
      [K.letterBody]: body,
      [K.letterHeading]: "A message",
      [K.letterEyebrow]: "A letter",
    };
    const out = html(<WealthImpactLetter f={f} number={2} sourceCount={1} />);
    expect(count(out, "wealth-impact-ltr__lead")).toBe(1);
    expect(out).toContain('href="#impact-source-1"');
    expect(out).toContain('aria-labelledby="letter-h"');
    expect(out).toContain("wealth-impact-rings--left");
    expect(out).toContain("02");
    expect(
      html(<WealthImpactLetter f={f} number={2} sourceCount={0} />),
    ).not.toContain("impact-source-1");
  });
  it("signed card renders for a name or a signature, with a decorative signature", () => {
    const none = html(
      <WealthImpactLetter
        f={{ [K.letterBody]: body }}
        number={2}
        sourceCount={0}
      />,
    );
    expect(none).not.toContain("wealth-impact-signed");
    const sig = html(
      <WealthImpactLetter
        f={{ [K.letterBody]: body, [K.letterSignatureImage]: "/sig.png" }}
        number={2}
        sourceCount={0}
      />,
    );
    expect(sig).toContain("wealth-impact-signed__sig");
    expect(sig).toContain('alt=""');
    const named = html(
      <WealthImpactLetter
        f={{
          [K.letterBody]: body,
          [K.letterName]: "Ada",
          [K.letterRole]: "Director",
          [K.letterSignoff]: "In Solidarity,",
          [K.letterImage]: "/ada.jpg",
          [K.letterImageAlt]: "Ada smiling",
        }}
        number={2}
        sourceCount={0}
      />,
    );
    expect(named).toContain("Ada");
    expect(named).toContain("Director");
    expect(named).toContain("In Solidarity,");
    expect(named).toContain("wealth-impact-portrait");
    expect(named).toContain('alt="Ada smiling"');
  });
});

describe("impact v2 B · who we are", () => {
  it("hasImpactAbout needs mission or history body", () => {
    expect(hasImpactAbout({})).toBe(false);
    expect(hasImpactAbout({ [K.missionHeading]: "Our mission" })).toBe(false);
    expect(hasImpactAbout({ [K.missionBody]: "x" })).toBe(true);
    expect(hasImpactAbout({ [K.historyBody]: "x" })).toBe(true);
  });
  const full = {
    [K.aboutEyebrow]: "Who we are",
    [K.missionHeading]: "Our mission",
    [K.missionBody]: "We exist.[1]",
    [K.missionImage]: "/m.jpg",
    [K.missionImageAlt]: "Members",
    [K.historyHeading]: "History",
    [K.historyBody]: "Founded.\n\nGrew.",
    [K.historyImage]: "/h.jpg",
    [K.historyImageAlt]: "Speaker",
  };
  it("has two h2s but one labelled heading; tinted mission + half-bleed history", () => {
    const out = html(<WealthImpactAbout f={full} number={3} sourceCount={1} />);
    expect(count(out, "<h2")).toBe(2);
    expect(count(out, "<h3")).toBe(0);
    expect(out).toContain('aria-labelledby="impact-about-h"');
    expect(out).toContain('id="impact-about-h"');
    expect(out).toContain('id="impact-about-history-h"');
    expect(out).toContain("wealth-photo--tint");
    expect(out).toContain("wealth-impact-bleed--right");
    expect(out).toContain('href="#impact-source-1"');
    expect(out).toContain("03");
  });
  it("mission without a photo sits on a surface field; history without a photo is one column", () => {
    const out = html(
      <WealthImpactAbout
        f={{
          ...full,
          [K.missionImage]: "",
          [K.historyImage]: "",
        }}
        number={3}
        sourceCount={0}
      />,
    );
    expect(out).toContain("wealth-impact-mission--plain");
    expect(out).not.toContain("wealth-photo--tint");
    expect(out).not.toContain("wealth-impact-bleed");
    expect(out).toContain("wealth-on-paper wealth-impact-mission__card");
  });
  it("history-only takes the numbered eyebrow and the label", () => {
    const out = html(
      <WealthImpactAbout
        f={{
          [K.aboutEyebrow]: "Who we are",
          [K.historyHeading]: "History",
          [K.historyBody]: "Founded.",
        }}
        number={3}
        sourceCount={0}
      />,
    );
    expect(out).not.toContain("wealth-impact-mission");
    expect(out).toContain('aria-labelledby="impact-about-history-h"');
    expect(out).toContain("Who we are");
    expect(count(out, "<h2")).toBe(1);
  });
  it("lone plain mission takes the surface tone", () => {
    const out = html(
      <WealthImpactAbout
        f={{ [K.missionHeading]: "Our mission", [K.missionBody]: "We exist." }}
        number={3}
        sourceCount={0}
      />,
    );
    expect(out).toMatch(
      /class="wealth-impact-anchor wealth-impact-about wealth-on-surface"/,
    );
  });
});

describe("impact v2 B · people", () => {
  const groups = parseImpactPeople([
    {
      group: "Meet our team",
      name: "Ian McCain",
      role: "Chair",
      image: "/i.jpg",
      imageAlt: "Ian",
    },
    { name: "Rosie Lee" },
    { group: "Board", name: "A One" },
    { name: "B Two" },
    { name: "C Three" },
    { name: "D Four" },
  ]);
  const out = html(
    <WealthImpactPeople
      f={{ [K.peopleHeading]: "The people", [K.peopleEyebrow]: "Our people" }}
      number={4}
      groups={groups}
    />,
  );
  it("renders a subhead per group, 4-up for 4+, list rows keyed by index", () => {
    expect(count(out, "<h3")).toBe(2);
    expect(out).toContain("wealth-impact-people__grid--4");
    expect(count(out, "wealth-impact-people__grid--4")).toBe(1);
    expect(out).toContain('data-sp-item="wealth.impact.people-items#0"');
    expect(out).toContain('data-sp-item="wealth.impact.people-items#5"');
    expect(count(out, "<h2")).toBe(1);
  });
  it("shows the role when set and initials when there is no photo", () => {
    expect(out).toContain("Chair");
    expect(out).toContain("wealth-impact-portrait__initials");
    expect(out).toContain("RL");
    expect(out).toContain("wealth-on-surface");
  });
  it("a group with no name renders no subhead", () => {
    const o = html(
      <WealthImpactPeople
        f={{ [K.peopleHeading]: "The people" }}
        number={4}
        groups={parseImpactPeople([{ name: "Solo" }])}
      />,
    );
    expect(o).not.toContain("<h3");
    expect(o).toContain("wealth-impact-people__group--nosub");
  });
});
