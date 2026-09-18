import type { CSSProperties } from "react";

import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { DreamHeading } from "../shared/dream-heading";
import { DreamRevealGroup } from "../shared/dream-reveal";

export type DreamPackageRow = {
  name: string;
  tagline: string;
  includes: string[];
  note: string;
  _id?: string;
};

function str(row: TemplateListRow, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

/** Splits the "Includes (one per line)" textarea into a clean bullet list. */
export function toPackageRow(row: TemplateListRow): DreamPackageRow {
  const includes = str(row, "includes")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    name: str(row, "name"),
    tagline: str(row, "tagline"),
    includes,
    note: str(row, "note"),
    _id: row._id,
  };
}

function PackageCard({ pkg, index }: { pkg: DreamPackageRow; index: number }) {
  return (
    <div
      className="dream-card dream-reveal-item flex h-full flex-col gap-4"
      style={{ "--i": Math.min(index, 7) } as CSSProperties}
    >
      <div className="flex flex-col gap-1.5">
        <DreamHeading as="h3">{pkg.name}</DreamHeading>
        {pkg.tagline && (
          <p className="text-[15px] leading-snug text-[var(--dream-soft)] italic">
            {pkg.tagline}
          </p>
        )}
      </div>

      {pkg.includes.length > 0 && (
        <ul className="flex flex-col gap-2 pl-0 text-[15px] leading-snug text-[var(--dream-ink)]">
          {pkg.includes.map((line, i) => (
            <li key={i} className="flex items-baseline gap-2">
              <span
                aria-hidden="true"
                className="mt-[2px] inline-block h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--dream-gold)]"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {pkg.note && (
        <p className="!mt-auto pt-2 text-[13px] leading-snug text-[var(--dream-soft)]">
          {pkg.note}
        </p>
      )}
    </div>
  );
}

type DreamPackagesProps = {
  heading: string;
  lede: string;
  packages: DreamPackageRow[];
  headingFieldKey?: string;
  ledeFieldKey?: string;
};

/**
 * Services index "Package ideas" grid (design.md "Services index →
 * Package ideas"): hairline paper cards, no prices, 5→2→1 responsive grid.
 * Defaults (Essence/Deluxe/Premium/Lavish/Yasss!) are supplied by the
 * caller when the owner hasn't customized the `dream.services.packages`
 * list field yet — a fresh business is never shown an empty grid.
 */
export function DreamPackages({
  heading,
  lede,
  packages,
  headingFieldKey,
  ledeFieldKey,
}: DreamPackagesProps) {
  return (
    <div>
      <style>{`
        .dream-packages-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: clamp(20px, 3vw, 28px);
        }
        @media (min-width: 640px) {
          .dream-packages-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1200px) {
          .dream-packages-grid { grid-template-columns: repeat(5, 1fr); }
        }
      `}</style>

      <div className="mb-10 max-w-[66ch]">
        <DreamHeading as="h2" fieldKey={headingFieldKey} className="!mb-3">
          {heading}
        </DreamHeading>
        {lede && (
          <p
            className="text-[17px] leading-relaxed text-[var(--dream-soft)]"
            {...(ledeFieldKey ? fieldAttr(ledeFieldKey) : {})}
          >
            {lede}
          </p>
        )}
      </div>

      <DreamRevealGroup className="dream-packages-grid" threshold={0.05}>
        {packages.map((pkg, i) => (
          <PackageCard key={pkg._id ?? pkg.name} pkg={pkg} index={i} />
        ))}
      </DreamRevealGroup>
    </div>
  );
}
