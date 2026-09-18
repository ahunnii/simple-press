import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

type Props = {
  heading: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
};

/**
 * UmscContactVisit — design.md "Contact #3": "Visit Our Stores" — markets/
 * pop-ups text + link. Hideable (contact.visit); hidden automatically when
 * the body field is blank.
 */
export function UmscContactVisit({ heading, body, linkLabel, linkUrl }: Props) {
  if (!body) return null;

  return (
    <UmscSection
      tone="cream"
      aria-label="Visit Our Stores"
      sectionAttrs={sectionGroupAttr("contact", "visit")}
    >
      <UmscReveal className="mx-auto flex max-w-[620px] flex-col items-center gap-4 text-center">
        {heading && (
          <UmscHeading as="h2" fieldKey="umsc.contact.visit-heading">
            {heading}
          </UmscHeading>
        )}
        <UmscLede fieldKey="umsc.contact.visit-body" className="text-center">
          {body}
        </UmscLede>
        {linkLabel && linkUrl && (
          <UmscButton
            as="link"
            href={linkUrl}
            variant="link"
            fieldKey="umsc.contact.visit-link-label"
          >
            {linkLabel}
          </UmscButton>
        )}
      </UmscReveal>
    </UmscSection>
  );
}
