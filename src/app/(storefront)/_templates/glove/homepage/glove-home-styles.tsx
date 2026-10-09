import { listItemAttr } from "~/lib/preview/section-attrs";

import {
  GloveHeading,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
  GloveStyleCard,
} from "../shared";

export type GloveStyleEntry = {
  id: string;
  /** Index in the saved list (editor row targeting). */
  index: number;
  name: string;
  blurb: string;
  image: string;
  imageAlt: string;
  buttonLabel: string;
  href: string;
};

type GloveHomeStylesProps = {
  heading: string;
  entries: GloveStyleEntry[];
  sectionAttrs?: Record<string, string>;
};

/** Round photo cards, one per glove style: 4 across on desktop, 2 on phones. */
export function GloveHomeStyles({
  heading,
  entries,
  sectionAttrs,
}: GloveHomeStylesProps) {
  if (entries.length === 0) return null;
  return (
    <GloveSection
      aria-labelledby={heading ? "glove-styles-heading" : undefined}
      aria-label={heading ? undefined : "Glove styles"}
      sectionAttrs={sectionAttrs}
    >
      {heading ? (
        <GloveHeading
          id="glove-styles-heading"
          fieldKey="glove.homepage.styles-heading"
        >
          {heading}
        </GloveHeading>
      ) : null}
      <GloveRevealGroup threshold={0}>
        <ul className="m-0 mt-10 grid list-none grid-cols-2 justify-items-center gap-x-3 gap-y-10 p-0 md:mt-12 lg:grid-cols-4 lg:gap-x-8">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="glove-reveal-item flex w-full justify-center"
              style={gloveRevealItemStyle(i)}
            >
              <GloveStyleCard
                name={entry.name}
                blurb={entry.blurb}
                image={entry.image}
                imageAlt={entry.imageAlt || entry.name}
                href={entry.href}
                buttonLabel={entry.buttonLabel}
                size={180}
                itemAttrs={listItemAttr(
                  "glove.homepage.styles-list",
                  entry.index,
                )}
              />
            </li>
          ))}
        </ul>
      </GloveRevealGroup>
    </GloveSection>
  );
}
