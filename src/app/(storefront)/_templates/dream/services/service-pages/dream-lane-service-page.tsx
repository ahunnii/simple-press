/**
 * `dream-lane` — the default service detail page (design.md "Service-page
 * variants → dream-lane"): hero (service data, not template fields), an
 * optional centered main photo, the owner's adaptive sections list, an
 * optional gallery, an Options grid built from this service's
 * `ServiceItem`s, and a closing Estimate Quote band.
 *
 * Fields live on `Service.customFields`, edited at `/admin/services/[id]` —
 * NOT the visual editor (there is no `sections.ts` entry for a service
 * detail page), so this file has no `sectionGroupAttr`/`fieldAttr`/
 * `isSectionVisible` calls. Mirrors wealth's/vii's per-service-template
 * pages (see `wealth-essay-service-page.tsx`).
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { db } from "~/server/db";

import { DreamGalleryGrid } from "../../shared/dream-gallery-grid";
import { DreamHeading } from "../../shared/dream-heading";
import { DreamPageHero } from "../../shared/dream-page-hero";
import { DreamPhoto } from "../../shared/dream-photo";
import { DreamQuoteCta } from "../../shared/dream-quote-cta";
import { DreamReveal } from "../../shared/dream-reveal";
import { DreamSection } from "../../shared/dream-section";
import { DreamAlternatingRow } from "../dream-alternating-row";
import { resolveDreamLaneSections } from "./dream-lane-sections";
import { DreamServiceItems } from "./dream-service-items";
import { resolveDreamLaneFields } from "./fields";

const FIELD_KEYS = [
  "dream-lane.show-cover",
  "dream-lane.image-crop",
  "dream-lane.sections-visible",
  "dream-lane.gallery",
  "dream-lane.gallery-heading",
  "dream-lane.gallery-lede",
  "dream-lane.options-heading",
  "dream-lane.cta-heading",
  "dream-lane.cta-accent",
  "dream-lane.cta-lede",
  "dream-lane.cta-label",
  "dream-lane.cta-url",
];

// Same wrapper contract as the services index lanes: the row's
// `[&:first-child]:pt-0` / `last:border-b-0` always match inside a reveal, so
// the wrapper carries the first-row padding and the divider hairline.
const ROW_WRAPPER =
  "border-b border-[var(--dream-line)] pt-12 first:pt-0 last:border-b-0";

export async function DreamLaneServicePage({
  business,
  service,
  items,
  embedsEnabled,
  afterSections,
}: ServiceTemplateProps & {
  /**
   * Rendered between the sections and the gallery (`dream-balloons` puts its
   * color studio here). Omitted → the Lane page is unchanged.
   */
  afterSections?: React.ReactNode;
}) {
  const f = resolveDreamLaneFields(service.customFields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  const showCover = f["dream-lane.show-cover"] !== "false";
  const coverFit = f["dream-lane.image-crop"] === "true" ? "cover" : "contain";

  const sections =
    f["dream-lane.sections-visible"] !== "false"
      ? resolveDreamLaneSections(service.customFields)
      : [];

  // Gallery: tenant-scoped lookup, gated on the `galleries` feature flag
  // (service templates don't receive it as a prop), only when an owner has
  // picked one. No empty state on service pages — nothing renders without
  // photos.
  const galleryId = f["dream-lane.gallery"]?.trim() ?? "";
  let gallery = null;
  if (galleryId) {
    const { isEnabled } = await getBusinessFlags();
    if (isEnabled("galleries")) {
      gallery = await db.gallery.findUnique({
        where: { id: galleryId, businessId: business.id },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      });
    }
  }
  const galleryHeading = f["dream-lane.gallery-heading"]?.trim() ?? "";
  const galleryLede = f["dream-lane.gallery-lede"]?.trim() ?? "";

  const publishedItems = items.filter((item) => item.published !== false);

  return (
    <article>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={service.name}
        lede={service.description ?? ""}
      />

      {showCover && service.image && (
        <DreamSection contained>
          {/* Own centering wrapper: `.dream .dream-photo { margin: 0 }` is
              unlayered and beats `mx-auto` on the figure itself. */}
          <div className="mx-auto w-full max-w-[900px]">
            <DreamPhoto
              src={service.image}
              alt={service.name}
              aspect="16 / 9"
              fit={coverFit}
            />
          </div>
        </DreamSection>
      )}

      {sections.length > 0 && (
        <DreamSection reveal={false}>
          {
            // Split rows alternate by their position among split rows only,
            // so a photo-only or text-only row in between keeps the rhythm.
            sections.reduce<{ nodes: React.ReactNode[]; splitCount: number }>(
              (acc, section) => {
                if (section.kind === "split") {
                  const reversed = acc.splitCount % 2 === 1;
                  acc.splitCount += 1;
                  acc.nodes.push(
                    <DreamReveal key={section.id} className={ROW_WRAPPER}>
                      <DreamAlternatingRow
                        reversed={reversed}
                        media={
                          <DreamPhoto
                            src={section.image}
                            alt={section.alt}
                            aspect="4 / 3"
                            fit={section.crop ? "cover" : "contain"}
                          />
                        }
                      >
                        <SectionText section={section} />
                      </DreamAlternatingRow>
                    </DreamReveal>,
                  );
                } else if (section.kind === "photo") {
                  acc.nodes.push(
                    <DreamReveal key={section.id} className={ROW_WRAPPER}>
                      <div className="mx-auto w-full max-w-[900px] pb-12">
                        <DreamPhoto
                          src={section.image}
                          alt={section.alt}
                          aspect="3 / 2"
                          fit={section.crop ? "cover" : "contain"}
                        />
                      </div>
                    </DreamReveal>,
                  );
                } else {
                  acc.nodes.push(
                    <DreamReveal key={section.id} className={ROW_WRAPPER}>
                      <div className="mx-auto w-full max-w-[60ch] pb-12 text-center">
                        <SectionText section={section} centered />
                      </div>
                    </DreamReveal>,
                  );
                }
                return acc;
              },
              { nodes: [], splitCount: 0 },
            ).nodes
          }
        </DreamSection>
      )}

      {afterSections}

      {gallery && gallery.images.length > 0 && (
        <DreamSection tone="sky" aria-label="Gallery" reveal={false}>
          {(galleryHeading || galleryLede) && (
            <DreamReveal>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                {galleryHeading && (
                  <DreamHeading as="h2">{galleryHeading}</DreamHeading>
                )}
                {galleryLede && (
                  <p className="max-w-[46ch] text-[var(--dream-soft)]">
                    {galleryLede}
                  </p>
                )}
              </div>
            </DreamReveal>
          )}
          <DreamGalleryGrid gallery={gallery} />
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
        ctaUrl={f["dream-lane.cta-url"] ?? ""}
      />
    </article>
  );
}

/** Heading + body of one section row (either may be absent, never both). */
function SectionText({
  section,
  centered,
}: {
  section: { heading: string; body: string };
  centered?: boolean;
}) {
  return (
    <>
      {section.heading && (
        <DreamHeading as="h2">{section.heading}</DreamHeading>
      )}
      {section.body && (
        <p
          className={
            (section.heading ? "!mt-4 " : "") +
            "max-w-[60ch] text-[17px] leading-relaxed text-[var(--dream-soft)]" +
            (centered ? " mx-auto" : "")
          }
        >
          {section.body}
        </p>
      )}
    </>
  );
}
