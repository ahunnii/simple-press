"use client";

import type { TemplateListRow } from "~/lib/template-fields";
import { cn } from "~/lib/utils";

import { useUmscReveal } from "../hooks/use-umsc-reveal";
import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  lede: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
  lines: TemplateListRow[];
  sectionAttrs?: Record<string, string>;
};

/** Real default "what to include" lines, shown until the owner customizes the list. */
const DEFAULT_LINES: TemplateListRow[] = [
  { _id: "l1", text: "Candles, wax melts, soaps, or body care" },
  { _id: "l2", text: "Bundles, favors, and corporate gifts" },
  { _id: "l3", text: "Your scent notes, your colors, your label" },
];

/**
 * UmscCustomSection (homepage.custom) — black band with the `.umsc-hairline-
 * draw` top rule; h2, lede, gold pill "Start a custom request" + ghost "Ask
 * a question"; right column a 3-line list of what to include with a
 * border-left gold hairline (design.md "Homepage → Custom band").
 */
export function UmscCustomSection({
  heading,
  lede,
  ctaLabel,
  ctaUrl,
  secondaryLabel,
  secondaryUrl,
  lines,
  sectionAttrs,
}: Props) {
  const { ref, visible } = useUmscReveal(0.15);
  const rows = lines.length > 0 ? lines : DEFAULT_LINES;

  return (
    <UmscSection
      tone="black"
      aria-labelledby="umsc-custom-heading"
      className="umsc-black-surface"
      sectionAttrs={sectionAttrs}
    >
      <div ref={ref}>
        <div
          aria-hidden="true"
          className={cn(
            "umsc-hairline-draw mb-12 h-px w-full bg-[var(--umsc-gold)]",
            visible && "is-visible",
          )}
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <div>
            <UmscHeading
              as="h2"
              id="umsc-custom-heading"
              fieldKey="umsc.homepage.custom-heading"
            >
              {heading}
            </UmscHeading>
            {lede && (
              <UmscLede
                onBlack
                fieldKey="umsc.homepage.custom-lede"
                className="mt-5"
              >
                {lede}
              </UmscLede>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {ctaLabel && (
                <UmscButton
                  variant="gold"
                  href={ctaUrl}
                  fieldKey="umsc.homepage.custom-cta-label"
                  showArrow={false}
                >
                  {ctaLabel}
                </UmscButton>
              )}
              {secondaryLabel && (
                <UmscButton
                  variant="ghost"
                  href={secondaryUrl}
                  fieldKey="umsc.homepage.custom-secondary-label"
                  showArrow={false}
                  className="umsc-btn-ghost-onblack"
                >
                  {secondaryLabel}
                </UmscButton>
              )}
            </div>
          </div>

          <ul
            role="list"
            className="m-0 grid list-none gap-3 border-l border-[var(--umsc-line-gold)] p-0 pl-6"
          >
            {rows.map((row, i) => {
              const text = typeof row.text === "string" ? row.text : "";
              if (!text) return null;
              return (
                <li
                  key={row._id ?? i}
                  className="umsc-sans text-[15px] leading-[1.5] text-[var(--umsc-cream-on-black)]"
                >
                  {text}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </UmscSection>
  );
}
