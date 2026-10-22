import type { OliveCardProduct } from "../shared";

import {
  OliveProductGrid,
  OliveReveal,
  OliveSection,
  OliveSectionHeading,
} from "../shared";

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
  emptyHeadingFieldKey?: string;
  emptyBodyFieldKey?: string;
};

/**
 * New arrivals — the page's commerce core, read like a lookbook row. Spaced
 * Bodoni capitals with a "SHOP ALL →" link on the title's baseline, then the
 * editorial product cards (no frame; colour dots under the price; quick-add
 * bar on hover) four across, two-up on a phone.
 *
 * Never hidden: a store with nothing to show gets the drawn empty state with
 * its own copy instead of a gap where the shop
 * should be.
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
  emptyHeadingFieldKey,
  emptyBodyFieldKey,
}: Props) {
  return (
    <OliveSection
      tone="ivory"
      aria-labelledby="olive-rail-heading"
      {...sectionAttrs}
    >
      <OliveReveal>
        <OliveSectionHeading
          heading={heading}
          id="olive-rail-heading"
          caps
          link={
            linkLabel && linkHref
              ? { label: linkLabel, href: linkHref }
              : undefined
          }
          headingFieldKey={headingFieldKey}
          linkFieldKey={linkLabelFieldKey}
          className="mb-8 md:mb-10"
        />
      </OliveReveal>

      <OliveProductGrid
        products={products}
        columns={4}
        // No priority images here: the hero photograph is the page's LCP, and
        // a second set of eager loads would compete with it.
        priorityCount={0}
        emptyHeading={emptyHeading}
        emptyBody={emptyBody}
        emptyHeadingFieldKey={emptyHeadingFieldKey}
        emptyBodyFieldKey={emptyBodyFieldKey}
      />
    </OliveSection>
  );
}
