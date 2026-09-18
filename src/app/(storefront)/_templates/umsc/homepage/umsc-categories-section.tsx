import type { TemplateListRow } from "~/lib/template-fields";

import { UmscButton } from "../shared/umsc-button";
import { UmscCollectionDoor } from "../shared/umsc-collection-door";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  lede: string;
  doors: TemplateListRow[];
  allLabel: string;
  allUrl: string;
  sectionAttrs?: Record<string, string>;
};

/**
 * Real default doors — shown whenever the owner hasn't customized the list
 * field yet, so a fresh store still has four working category doors instead
 * of an empty grid (design.md "Homepage → Shop by type").
 */
const DEFAULT_DOORS: TemplateListRow[] = [
  {
    _id: "candles",
    image: "/placeholder.svg",
    title: "Candles",
    blurb: "Soy candles and wax melts.",
    link: "/collections/candles",
  },
  {
    _id: "soaps",
    image: "/placeholder.svg",
    title: "Soaps",
    blurb: "Handmade bars for gifts and daily use.",
    link: "/collections/soaps",
  },
  {
    _id: "body-care",
    image: "/placeholder.svg",
    title: "Body Care",
    blurb: "Butters, oils, and roll-ons.",
    link: "/collections/body-care",
  },
  {
    _id: "home-care",
    image: "/placeholder.svg",
    title: "Home Care",
    blurb: "Laundry pods, bleach tablets, and mists.",
    link: "/collections/home-care",
  },
];

/**
 * UmscCategoriesSection (homepage.categories) — h2 + lede, four
 * `UmscCollectionDoor`s from the `categories-doors` list field (defaults to
 * Candles / Soaps / Body Care / Home Care), "All products →" link, 4→2→1
 * grid with a `UmscRevealGroup` stagger.
 */
export function UmscCategoriesSection({
  heading,
  lede,
  doors,
  allLabel,
  allUrl,
  sectionAttrs,
}: Props) {
  const rows = doors.length > 0 ? doors : DEFAULT_DOORS;

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
        {allLabel && (
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
        {rows.map((row, i) => {
          const image = typeof row.image === "string" ? row.image : "";
          const title = typeof row.title === "string" ? row.title : "";
          const blurb = typeof row.blurb === "string" ? row.blurb : "";
          const link =
            typeof row.link === "string" && row.link.trim()
              ? row.link
              : "/shop";
          return (
            <div
              key={row._id ?? i}
              className="umsc-reveal-item"
              style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
            >
              <UmscCollectionDoor
                href={link}
                title={title}
                blurb={blurb}
                image={image}
              />
            </div>
          );
        })}
      </UmscRevealGroup>
    </UmscSection>
  );
}
