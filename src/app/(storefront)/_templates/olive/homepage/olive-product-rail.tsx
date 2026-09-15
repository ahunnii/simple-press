import type { OliveCardProduct } from "../shared";

import { OliveProductGrid, OliveSection, OliveSectionHeading } from "../shared";

type Props = {
  heading: string;
  linkLabel: string;
  linkHref: string;
  products: OliveCardProduct[];
  emptyHeading: string;
  emptyBody: string;
  sectionAttrs?: Record<string, string>;
  headingFieldKey?: string;
  linkLabelFieldKey?: string;
};

/**
 * New arrivals in the swatch grid — the page's commerce core, and the reason
 * the rest of it exists. Eight cards at four columns, two-up on a phone, each
 * with its real variant colours as chips and a quick-add pill.
 *
 * Never hidden: a store with nothing to show gets the ghost card with its own
 * copy instead of a gap where the shop should be.
 */
export function OliveProductRail({
  heading,
  linkLabel,
  linkHref,
  products,
  emptyHeading,
  emptyBody,
  sectionAttrs,
  headingFieldKey,
  linkLabelFieldKey,
}: Props) {
  return (
    <OliveSection
      tone="white"
      aria-labelledby="olive-rail-heading"
      {...sectionAttrs}
    >
      <OliveSectionHeading
        heading={heading}
        id="olive-rail-heading"
        link={linkLabel ? { label: linkLabel, href: linkHref } : undefined}
        headingFieldKey={headingFieldKey}
        linkFieldKey={linkLabelFieldKey}
        className="mb-8"
      />

      <OliveProductGrid
        products={products}
        columns={4}
        // No priority images here: the hero photograph is the page's LCP, and
        // a second set of eager loads would compete with it.
        priorityCount={0}
        emptyHeading={emptyHeading}
        emptyBody={emptyBody}
      />
    </OliveSection>
  );
}
