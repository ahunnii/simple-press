import type { CSSProperties } from "react";

import type { UmscStore } from "./umsc-stores";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal, UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { UmscStoreCard } from "../shared/umsc-store-card";
import { UMSC_STORES_KEY } from "./umsc-stores";

type Props = {
  heading: string;
  body: string;
  /** From `resolveUmscStores(...)` — named rows only, never empty here. */
  stores: UmscStore[];
};

/**
 * UmscContactStores — "Find us in stores" cards: shops that carry the
 * owner's work (other businesses, not her own locations). Hideable
 * (contact.stores) and hidden while no store is listed. `#stores` is the
 * footer link's target; `scroll-mt-28` clears the sticky header (≈64px
 * scrolled, ≈90px at the top). Cards flex-wrap and centre, so a short or
 * partly-filled last row never looks lopsided.
 */
export function UmscContactStores({ heading, body, stores }: Props) {
  if (stores.length === 0) return null;

  return (
    <UmscSection
      id="stores"
      tone="cream"
      aria-label={heading || "Find us in stores"}
      className="scroll-mt-28"
      sectionAttrs={sectionGroupAttr("contact", "stores")}
    >
      <UmscReveal className="mx-auto flex max-w-[620px] flex-col items-center gap-4 text-center">
        {heading && (
          <UmscHeading as="h2" fieldKey="umsc.contact.stores-heading">
            {heading}
          </UmscHeading>
        )}
        {body && (
          <UmscLede fieldKey="umsc.contact.stores-body" className="text-center">
            {body}
          </UmscLede>
        )}
      </UmscReveal>
      <UmscRevealGroup className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-12">
        {stores.map((store, i) => (
          <UmscStoreCard
            key={store.rowIndex}
            store={store}
            fieldKey={UMSC_STORES_KEY}
            className="umsc-reveal-item w-full sm:w-[calc((100%-2rem)/2)] lg:w-[calc((100%-4rem)/3)]"
            style={{ "--i": Math.min(i, 6) } as CSSProperties}
          />
        ))}
      </UmscRevealGroup>
    </UmscSection>
  );
}
