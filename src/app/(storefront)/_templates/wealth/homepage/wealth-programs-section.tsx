import Image from "next/image";
import Link from "next/link";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthSection } from "../shared/wealth-section";
import { WealthSectionHeading } from "../shared/wealth-section-heading";

type Tile = {
  key: string;
  image: string;
  label: string;
  url: string;
};

type Props = {
  heading: string;
  intro: string;
  leadin: string;
  tiles: Tile[];
};

/**
 * Our Programs — centered italic heading + intro + underlined lead-in, then
 * a row of 4 square tiles with a sage scrim-hover (design.md: ".1s
 * ease-in-out", matching `--wealth-dur-hover`). CEND's tile is the only
 * external link (design.md).
 */
export function WealthProgramsSection({
  heading,
  intro,
  leadin,
  tiles,
}: Props) {
  return (
    <WealthSection sectionAttrs={sectionGroupAttr("homepage", "programs")}>
      <div className="mx-auto max-w-3xl text-center">
        <WealthSectionHeading className="mb-4">
          <span {...fieldAttr("wealth.homepage.programs-heading")}>
            {heading}
          </span>
        </WealthSectionHeading>
        <p className="mb-4" {...fieldAttr("wealth.homepage.programs-intro")}>
          {intro}
        </p>
        <p className="mb-[var(--wealth-rhythm)]">
          <span
            className="wealth-link"
            {...fieldAttr("wealth.homepage.programs-leadin")}
          >
            {leadin}
          </span>
        </p>
      </div>

      <WealthRevealGroup className="mx-auto grid max-w-3xl grid-cols-2 gap-[var(--wealth-gutter)] sm:grid-cols-4">
        {tiles.map((tile, i) => {
          const isExternal = /^https?:\/\//i.test(tile.url);
          return (
            <Link
              key={tile.key}
              href={tile.url}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              aria-label={tile.label}
              className="wealth-reveal-item group relative block aspect-square overflow-hidden bg-[var(--wealth-surface)]"
              style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
            >
              {tile.image ? (
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-transparent transition-colors duration-100 ease-in-out group-hover:bg-[color-mix(in_srgb,var(--wealth-primary)_22%,transparent)]"
              />
            </Link>
          );
        })}
      </WealthRevealGroup>
    </WealthSection>
  );
}
