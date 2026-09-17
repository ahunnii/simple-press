/**
 * `dream-lane` — the default service detail page (design.md "Service-page
 * variants → dream-lane"): hero (service data, not template fields), three
 * alternating story blocks, an Options grid built from this service's
 * `ServiceItem`s, and a closing Estimate Quote band.
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors wealth's/vii's per-service-template
 * pages (see `wealth-essay-service-page.tsx`).
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { resolveLogoAlt } from "~/lib/logo-alt";

import { DreamHeading } from "../../shared/dream-heading";
import { DreamPageHero } from "../../shared/dream-page-hero";
import { DreamPhoto } from "../../shared/dream-photo";
import { DreamQuoteCta } from "../../shared/dream-quote-cta";
import { DreamSection } from "../../shared/dream-section";
import { DreamAlternatingRow } from "../dream-alternating-row";
import { DreamServiceItems } from "./dream-service-items";
import { resolveDreamLaneFields } from "./fields";

const FIELD_KEYS = [
  "dream-lane.block-1-heading",
  "dream-lane.block-1-body",
  "dream-lane.block-1-image",
  "dream-lane.block-1-alt",
  "dream-lane.block-2-heading",
  "dream-lane.block-2-body",
  "dream-lane.block-2-image",
  "dream-lane.block-2-alt",
  "dream-lane.block-3-heading",
  "dream-lane.block-3-body",
  "dream-lane.block-3-image",
  "dream-lane.block-3-alt",
  "dream-lane.options-heading",
  "dream-lane.cta-heading",
  "dream-lane.cta-accent",
  "dream-lane.cta-lede",
  "dream-lane.cta-label",
  "dream-lane.cta-url",
];

type StoryBlock = {
  heading: string;
  body: string;
  image: string;
  alt: string;
};

export function DreamLaneServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const f = resolveDreamLaneFields(service.customFields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  const blocks: StoryBlock[] = [1, 2, 3]
    .map((n) => ({
      heading: f[`dream-lane.block-${n}-heading`] ?? "",
      body: f[`dream-lane.block-${n}-body`] ?? "",
      image: f[`dream-lane.block-${n}-image`] ?? "/placeholder.svg",
      alt: f[`dream-lane.block-${n}-alt`] ?? "",
    }))
    .filter((block) => block.heading.trim().length > 0);

  const publishedItems = items.filter((item) => item.published !== false);

  return (
    <article>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={service.name}
        lede={service.description ?? ""}
      />

      {service.image && (
        <DreamSection contained>
          <DreamPhoto
            src={service.image}
            alt={service.name}
            aspect="16 / 9"
            className="mx-auto max-w-[900px]"
          />
        </DreamSection>
      )}

      {blocks.length > 0 && (
        <DreamSection reveal={false}>
          {blocks.map((block, i) => (
            <DreamAlternatingRow
              key={i}
              reversed={i % 2 === 1}
              divider={i !== blocks.length - 1}
              media={
                <DreamPhoto src={block.image} alt={block.alt} aspect="4 / 3" />
              }
            >
              <DreamHeading as="h2">{block.heading}</DreamHeading>
              {block.body && (
                <p className="!mt-4 max-w-[60ch] text-[17px] leading-relaxed text-[var(--dream-soft)]">
                  {block.body}
                </p>
              )}
            </DreamAlternatingRow>
          ))}
        </DreamSection>
      )}

      {publishedItems.length > 0 && (
        <DreamSection tone="sky">
          <DreamServiceItems
            items={publishedItems}
            embedsEnabled={embedsEnabled}
            heading={f["dream-lane.options-heading"] ?? "Options"}
          />
        </DreamSection>
      )}

      <DreamQuoteCta
        heading={f["dream-lane.cta-heading"] ?? ""}
        accent={f["dream-lane.cta-accent"] ?? ""}
        lede={f["dream-lane.cta-lede"] ?? ""}
        ctaLabel={f["dream-lane.cta-label"] ?? ""}
        ctaUrl={f["dream-lane.cta-url"] ?? "/contact"}
      />
    </article>
  );
}
