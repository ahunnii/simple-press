import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  buttonLabel: string;
  buttonUrl: string;
};

/**
 * UmscAboutCta — design.md "About #6": black closing band, h2 + gold pill
 * to /shop. Hideable (about.cta).
 */
export function UmscAboutCta({ heading, buttonLabel, buttonUrl }: Props) {
  if (!heading && !buttonLabel) return null;

  return (
    <UmscSection
      tone="black"
      aria-label="Shop Unique Monique"
      sectionAttrs={sectionGroupAttr("about", "cta")}
      className="border-t-2 border-[var(--umsc-gold)]"
    >
      <UmscReveal className="flex flex-col items-center gap-8 text-center">
        {heading && (
          <UmscHeading
            as="h2"
            fieldKey="umsc.about.cta-heading"
            className="text-[var(--umsc-cream-on-black)]"
          >
            {heading}
          </UmscHeading>
        )}
        {buttonLabel && (
          <UmscButton
            as="link"
            href={buttonUrl || "/shop"}
            variant="gold"
            fieldKey="umsc.about.cta-button-label"
          >
            {buttonLabel}
          </UmscButton>
        )}
      </UmscReveal>
    </UmscSection>
  );
}
