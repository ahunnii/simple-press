import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  quote: string;
};

/**
 * UmscAboutMission — design.md "About #3": cream band, one Marcellus
 * pull-quote (her mission sentence) with a gold hairline above and below.
 * Not hideable.
 */
export function UmscAboutMission({ quote }: Props) {
  if (!quote) return null;

  return (
    <UmscSection
      tone="cream"
      aria-label="Our mission"
      sectionAttrs={sectionGroupAttr("about", "mission")}
    >
      <UmscReveal className="mx-auto flex max-w-[820px] flex-col items-center gap-8 text-center">
        <span aria-hidden="true" className="h-px w-16 bg-[var(--umsc-gold)]" />
        <blockquote
          {...fieldAttr("umsc.about.mission-quote")}
          className="umsc-serif m-0 text-[clamp(26px,3.4vw,38px)] leading-[1.35] text-[var(--umsc-ink)]"
        >
          &ldquo;{quote}&rdquo;
        </blockquote>
        <span aria-hidden="true" className="h-px w-16 bg-[var(--umsc-gold)]" />
      </UmscReveal>
    </UmscSection>
  );
}
