import type { WealthStatRow } from "./wealth-homepage-rows";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthStats } from "../shared/wealth-stats";
import { WealthStatsSplit } from "../shared/wealth-stats-split";

type Props = {
  image: string;
  imageAlt: string;
  eyebrow: string;
  heading: string;
  /** Owner-entered rows only. The orchestrator never renders this section
   *  with an empty list — no sample figures ship. */
  stats: WealthStatRow[];
  /** Either blank hides the button. */
  linkLabel: string;
  linkHref: string;
};

/**
 * By the numbers — duotone event photo + primary panel holding up to three
 * big numbers and a button to the impact report.
 */
export function WealthStatsSection({
  image,
  imageAlt,
  eyebrow,
  heading,
  stats,
  linkLabel,
  linkHref,
}: Props) {
  if (stats.length === 0) return null;
  const hasHeading = heading.trim() !== "";
  const showLink = linkLabel.trim() !== "" && linkHref !== "";
  return (
    <WealthStatsSplit
      {...sectionGroupAttr("homepage", "stats")}
      aria-labelledby={hasHeading ? "wealth-stats-h" : undefined}
      image={image}
      imageAlt={imageAlt}
      imagePosition="30% 50%"
      head={
        eyebrow.trim() || hasHeading ? (
          <WealthReveal>
            {eyebrow.trim() ? (
              <WealthEyebrow
                as="p"
                className="wealth-eyebrow--block"
                {...fieldAttr("wealth.homepage.stats-eyebrow")}
              >
                {eyebrow}
              </WealthEyebrow>
            ) : null}
            {hasHeading ? (
              <h2
                className="wealth-display"
                id="wealth-stats-h"
                {...fieldAttr("wealth.homepage.stats-heading")}
              >
                {heading}
              </h2>
            ) : null}
          </WealthReveal>
        ) : undefined
      }
      foot={
        showLink ? (
          <WealthReveal>
            <WealthLedgeButton href={linkHref} onDark>
              <span {...fieldAttr("wealth.homepage.stats-link-label")}>
                {linkLabel}
              </span>
            </WealthLedgeButton>
          </WealthReveal>
        ) : undefined
      }
    >
      <WealthReveal delay={1}>
        <WealthStats
          variant="rows"
          items={stats.map((row) => ({
            key: `stat-${row.sourceIndex}`,
            value: row.value,
            caption: row.caption || undefined,
            attrs: listItemAttr("wealth.homepage.stats-items", row.sourceIndex),
          }))}
        />
      </WealthReveal>
    </WealthStatsSplit>
  );
}
