import type { CSSProperties } from "react";

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
};

type Props = {
  heading: string;
  entries: OliveCategoryEntry[];
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
};

/**
 * The chip rotation for the category tabs. It mirrors `oliveChipToken` in the
 * nav overlay, re-declared here because that module is `"use client"` and this
 * section is not — a server component cannot call an export that lives behind
 * the client boundary.
 */
const CATEGORY_CHIP_TOKENS = [
  "var(--olive-sage-bright)",
  "var(--olive-slate)",
  "var(--olive-leaf)",
  "var(--olive-sage-tint)",
] as const;

/**
 * The category fan — four photographic cards, each with the category on a tab
 * in its corner, dealt as a hand rather than snapped into a grid.
 *
 * The chip on each tab is a sanctioned use of a chip outside product colour:
 * it marks the category (design.md § chip discipline). When the owner has not
 * built the list, the row falls back to the shop's own published collections,
 * so a new store shows real cards rather than a gap.
 *
 * `OliveCategoryCard` takes a `labelFieldKey`, but these labels deliberately
 * do NOT pass one: they come from rows of the `categories-cards` LIST field
 * (or from collection names), and the editor's live-text patcher only ever
 * sends `text`/`textarea` scalars. Annotating a list row would be inert at
 * best — editing a label goes through the preview reload instead.
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
      tone="white"
      aria-labelledby="olive-categories-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-categories-heading"
        headingFieldKey={headingFieldKey}
        className="mb-8"
      />

      <OliveRevealGroup fan className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {shown.map((entry, index) => (
          <OliveCategoryCard
            key={entry.id}
            image={entry.image}
            alt=""
            label={entry.label}
            href={entry.href}
            chipColor={
              CATEGORY_CHIP_TOKENS[index % CATEGORY_CHIP_TOKENS.length]
            }
            className="olive-reveal-item"
            style={{ "--i": index } as CSSProperties}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 320px"
          />
        ))}
      </OliveRevealGroup>
    </OliveSection>
  );
}
