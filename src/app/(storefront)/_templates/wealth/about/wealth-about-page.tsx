import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TemplateListRow } from "~/lib/template-fields";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { WealthHr } from "../shared/wealth-hr";
import { WealthAboutBoard } from "./wealth-about-board";
import { WealthAboutCta } from "./wealth-about-cta";
import { WealthAboutDirector } from "./wealth-about-director";
import { WealthAboutHero } from "./wealth-about-hero";

// Built-in example board, used when the owner hasn't configured any members.
const DEFAULT_BOARD: TemplateListRow[] = [
  { _id: "default-board-1", name: "Gerrard Allen, Chair" },
  { _id: "default-board-2", name: "Treasurer - seeking Nomination" },
  { _id: "default-board-3", name: "Carly Priehs, Secretary" },
  { _id: "default-board-4", name: "Ian McCain" },
];

export function WealthAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "wealth.about.hero-heading",
    "wealth.about.hero-paragraph-1",
    "wealth.about.hero-paragraph-2",
    "wealth.about.hero-paragraph-3",
    "wealth.about.director-image",
    "wealth.about.director-image-alt",
    "wealth.about.director-name-title",
    "wealth.about.director-bio-1",
    "wealth.about.director-bio-2",
    "wealth.about.director-bio-3",
    "wealth.about.director-email",
    "wealth.about.board-heading",
    "wealth.about.cta-label",
    "wealth.about.cta-url",
  ]);

  const parsedBoard = parseTemplateListRows(
    customFields?.["wealth.about.board-members"],
  );
  const board = parsedBoard.length > 0 ? parsedBoard : DEFAULT_BOARD;

  return (
    <div>
      {/* 1. About DCWF — H1 + verbatim story (not hideable) */}
      <WealthAboutHero
        heading={f["wealth.about.hero-heading"] ?? "About DCWF"}
        paragraph1={f["wealth.about.hero-paragraph-1"] ?? ""}
        paragraph2={f["wealth.about.hero-paragraph-2"] ?? ""}
        paragraph3={f["wealth.about.hero-paragraph-3"] ?? ""}
      />

      {isSectionVisible(customFields, "wealth", "about.director") && (
        <>
          <WealthHr />
          <WealthAboutDirector
            image={
              f["wealth.about.director-image"] ??
              "/templates/wealth/images/director.jpg"
            }
            imageAlt={f["wealth.about.director-image-alt"] ?? ""}
            nameTitle={f["wealth.about.director-name-title"] ?? ""}
            bio1={f["wealth.about.director-bio-1"] ?? ""}
            bio2={f["wealth.about.director-bio-2"] ?? ""}
            bio3={f["wealth.about.director-bio-3"] ?? ""}
            email={f["wealth.about.director-email"] ?? ""}
          />
        </>
      )}

      {isSectionVisible(customFields, "wealth", "about.board") && (
        <>
          <WealthHr />
          <WealthAboutBoard
            heading={f["wealth.about.board-heading"] ?? "Board of Directors"}
            members={board}
          />
        </>
      )}

      {isSectionVisible(customFields, "wealth", "about.cta") && (
        <>
          <WealthHr />
          <WealthAboutCta
            label={f["wealth.about.cta-label"] ?? ""}
            url={f["wealth.about.cta-url"] ?? "/contact"}
          />
        </>
      )}
    </div>
  );
}
