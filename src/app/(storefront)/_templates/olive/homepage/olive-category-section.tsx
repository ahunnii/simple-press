import type { CSSProperties } from "react";

import { listItemAttr } from "~/lib/preview/section-attrs";

import {
  OliveCategoryCard,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

/** One card in the row, already resolved from either the owner's list or the store's collections. */
export type OliveCategoryEntry = {
  id: string;
  image: string;
  label: string;
  href: string;
  /**
   * Original (pre-filter) position in the owner's `categories-cards` list.
   * `undefined` when this entry was built from the shop's own collections
   * (the empty-list fallback) — those rows have no matching list item to
   * click-target, so they never carry `listItemAttr`.
   */
  sourceIndex?: number;
};

type Props = {
  heading: string;
  entries: OliveCategoryEntry[];
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
};

/**
 * Shop by occasion — four photo tiles with centred tracked-caps captions
 * underneath ("EVERYDAY ELEVATED", "AFTER HOURS"), slightly wider than tall
 * as on the board. Four across from md, two-up on a phone.
 *
 * When the owner has not built the list, the row falls back to the shop's own
 * published collections, so a new store shows real tiles rather than a gap.
 *
 * `OliveCategoryCard` takes a `labelFieldKey`, but these captions
 * deliberately do NOT pass one: they come from rows of the `categories-cards`
 * LIST field (or from collection names), and the editor's live-text patcher
 * only ever sends `text`/`textarea` scalars. Editing a caption goes through
 * the preview reload instead (each tile still carries `listItemAttr`).
 */
export function OliveCategorySection({
  heading,
  entries,
  sectionAttrs,
  headingFieldKey,
}: Props) {
  if (entries.length === 0) return null;

  const shown = entries.slice(0, 4);

  return (
    <OliveSection
      tone="ivory"
      aria-labelledby="olive-categories-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-categories-heading"
        caps
        headingFieldKey={headingFieldKey}
        className="mb-8 md:mb-10"
      />

      <OliveRevealGroup className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-4 md:gap-x-5">
        {shown.map((entry, index) => (
          <div
            key={entry.id}
            {...(entry.sourceIndex !== undefined
              ? listItemAttr(
                  "olive.homepage.categories-cards",
                  entry.sourceIndex,
                )
              : {})}
            className="olive-reveal-item"
            style={{ "--i": index } as CSSProperties}
          >
            <OliveCategoryCard
              image={entry.image}
              alt=""
              label={entry.label}
              href={entry.href}
              aspect="6 / 5"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
            />
          </div>
        ))}
      </OliveRevealGroup>
    </OliveSection>
  );
}
