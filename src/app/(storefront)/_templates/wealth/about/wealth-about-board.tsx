import type { TemplateListRow } from "~/lib/template-fields";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";

type Props = {
  heading: string;
  members: TemplateListRow[];
};

/**
 * Board of Directors — sage block: centered italic H2 over a 3 / 2 / 1-up
 * grid of Jost-semibold caps names, each under a sage-rule hairline. Names
 * keep their position in the saved list (`listItemAttr` index) even when a
 * blank row is skipped. Hideable (about.board).
 */
export function WealthAboutBoard({ heading, members }: Props) {
  const names = members
    .map((member, index) => ({
      id: member._id ?? String(index),
      index,
      name: typeof member.name === "string" ? member.name.trim() : "",
    }))
    .filter((m) => m.name !== "");

  if (names.length === 0) return null;
  const hasHeading = heading.trim() !== "";

  return (
    <WealthBlock
      tone="sage"
      aria-labelledby={hasHeading ? "wealth-about-board-h" : undefined}
      aria-label={hasHeading ? undefined : "Board of Directors"}
      {...sectionGroupAttr("about", "board")}
    >
      {hasHeading ? (
        <WealthReveal className="wealth-section-head wealth-section-head--center">
          <h2
            id="wealth-about-board-h"
            className="wealth-h2"
            {...fieldAttr("wealth.about.board-heading")}
          >
            {heading}
          </h2>
        </WealthReveal>
      ) : null}
      <WealthRevealGroup threshold={0}>
        <ul className="wealth-about-board__list">
          {names.map((m, i) => (
            <li
              key={m.id}
              className="wealth-about-board__name wealth-reveal-item"
              style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
              {...listItemAttr("wealth.about.board-members", m.index)}
            >
              {m.name}
            </li>
          ))}
        </ul>
      </WealthRevealGroup>
    </WealthBlock>
  );
}
