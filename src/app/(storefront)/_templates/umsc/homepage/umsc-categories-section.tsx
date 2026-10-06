import { UmscButton } from "../shared/umsc-button";
import { UmscCollectionDoor } from "../shared/umsc-collection-door";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

export type UmscCategoryDoor = {
  id: string;
  href: string;
  title: string;
  blurb: string;
  image?: string;
};

type Props = {
  heading: string;
  lede: string;
  doors: UmscCategoryDoor[];
  allLabel: string;
  allUrl: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * UmscCategoriesSection (homepage.categories) — h2 + lede, up to four
 * `UmscCollectionDoor`s built by the homepage from the store's first published
 * collections (name, image, description or item count), "All products →"
 * link, 4→2→1 grid with a `UmscRevealGroup` stagger.
 */
export function UmscCategoriesSection({
  heading,
  lede,
  doors,
  allLabel,
  allUrl,
  sectionAttrs,
}: Props) {
  return (
    <UmscSection
      tone="paper"
      aria-labelledby="umsc-categories-heading"
      sectionAttrs={sectionAttrs}
    >
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-14">
        <div>
          <UmscHeading
            as="h2"
            id="umsc-categories-heading"
            fieldKey="umsc.homepage.categories-heading"
          >
            {heading}
          </UmscHeading>
          {lede && (
            <UmscLede fieldKey="umsc.homepage.categories-lede" className="mt-3">
              {lede}
            </UmscLede>
          )}
        </div>
        {allLabel && allUrl && (
          <UmscButton
            variant="link"
            href={allUrl}
            fieldKey="umsc.homepage.categories-all-label"
          >
            {allLabel}
          </UmscButton>
        )}
      </div>

      <UmscRevealGroup className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
        {doors.map((door, i) => (
          <div
            key={door.id}
            className="umsc-reveal-item"
            style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
          >
            <UmscCollectionDoor
              href={door.href}
              title={door.title}
              blurb={door.blurb}
              image={door.image}
              blurbClassName="line-clamp-2"
            />
          </div>
        ))}
      </UmscRevealGroup>
    </UmscSection>
  );
}
