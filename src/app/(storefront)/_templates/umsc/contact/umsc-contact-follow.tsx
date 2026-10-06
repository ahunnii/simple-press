import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UMSC_META_CLASS } from "../generic/umsc-page-kit";
import type { UmscSocialLink } from "../shared/umsc-contact-details";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { UmscSocialIcons } from "../shared/umsc-social-icons";

type Props = {
  heading: string;
  body: string;
  /** From `resolveUmscContactDetails(...).socials` (Content → Branding). */
  socials: UmscSocialLink[];
};

/**
 * UmscContactFollow — "Follow Monique" band: heading, optional lede, then a
 * row of large circular social icons with the network name beneath each.
 * Hideable (contact.visit — the id predates the redesign from "Visit Our
 * Stores"); hidden automatically when no social links are set in Content →
 * Branding.
 */
export function UmscContactFollow({ heading, body, socials }: Props) {
  if (socials.length === 0) return null;

  return (
    <UmscSection
      tone="cream"
      aria-label={heading || "Follow on social"}
      sectionAttrs={sectionGroupAttr("contact", "visit")}
    >
      <UmscReveal className="mx-auto flex max-w-[620px] flex-col items-center gap-4 text-center">
        {heading && (
          <UmscHeading as="h2" fieldKey="umsc.contact.visit-heading">
            {heading}
          </UmscHeading>
        )}
        {body && (
          <UmscLede fieldKey="umsc.contact.visit-body" className="text-center">
            {body}
          </UmscLede>
        )}
        <UmscSocialIcons
          links={socials}
          showLabel
          className="mt-4 flex-wrap justify-center gap-x-8 gap-y-6"
          linkClassName="group flex min-w-[56px] flex-col items-center gap-3 text-[var(--umsc-ink)] no-underline"
          iconWrapClassName="flex size-14 items-center justify-center rounded-full border border-[var(--umsc-line-gold)] transition-colors duration-200 group-hover:border-[var(--umsc-gold-ink)] group-hover:text-[var(--umsc-gold-ink)]"
          iconClassName="size-7"
          labelClassName={`${UMSC_META_CLASS} text-[11px] text-[var(--umsc-muted)] transition-colors duration-200 group-hover:text-[var(--umsc-gold-ink)]`}
        />
      </UmscReveal>
    </UmscSection>
  );
}
