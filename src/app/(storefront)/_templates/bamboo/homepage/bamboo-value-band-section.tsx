import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { StaggerContainer, StaggerItem } from "~/components/page-animations";

import { DEFAULT_BAMBOO_VALUE_BAND } from ".";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";

type Props = { customFields: unknown };

/**
 * Gold wave → green value band, bamboo's third signature moment.
 *
 * The wave is `shared/bamboo-wave-divider.tsx` (canonical geometry, tokens
 * only) — a RECORDED deliberate divergence from the happy-bamboo lineage
 * (docs/templates/bamboo/design.md, "Deliberate divergences"). The svg
 * carries `-mb-px` so the forest band paints over the last device pixel and
 * no hairline seam can open up at fractional zoom levels.
 */
export function BambooValueBandSection({ customFields }: Props) {
  const items =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.value-band-items"),
      DEFAULT_BAMBOO_VALUE_BAND,
    ) ?? [];

  if (items.length === 0) return null;

  return (
    <section
      {...sectionGroupAttr("homepage", "valueBand")}
      aria-label="What we stand for"
    >
      <div className="bg-[var(--bam-cream)]">
        <BambooWaveDivider className="-mb-px h-14 md:h-24" />
      </div>

      <div className="bg-[var(--bam-forest)]">
        <div className="mx-auto max-w-7xl px-4 pt-10 pb-14 lg:px-8 lg:pt-14 lg:pb-20">
          <StaggerContainer
            className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0"
            staggerDelay={0.1}
          >
            {items.slice(0, 4).map((item, index) => (
              <StaggerItem
                key={`${item.title}-${index}`}
                className={cn(
                  "flex flex-col items-center gap-4 px-3 text-center lg:px-6",
                  index > 0 &&
                    "md:border-l md:border-[var(--bam-gold-soft)]/25",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--bam-gold-soft)]/60"
                >
                  <item.icon className="size-6 text-[var(--bam-gold-soft)]" />
                </span>
                <p className="text-sm leading-relaxed text-balance text-[var(--bam-gold-soft)]">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="text-xs leading-relaxed text-[var(--bam-cream)]/70">
                    {item.description}
                  </p>
                ) : null}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
