import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { DREAM_PACKAGES_DEFAULT_ROWS } from ".";
import { resolveFields } from "..";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
import { DreamReveal } from "../shared/dream-reveal";
import { DreamSection } from "../shared/dream-section";
import { DreamEmptyLane } from "./dream-empty-lane";
import { DreamPackages, toPackageRow } from "./dream-packages";
import { DreamServiceLaneRow } from "./dream-service-lane-row";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "dream.services.hero-heading",
  "dream.services.hero-accent",
  "dream.services.hero-lede",
  "dream.services.lanes-see-details-label",
  "dream.services.lanes-empty-heading",
  "dream.services.lanes-empty-body",
  "dream.services.lanes-empty-cta-label",
  "dream.services.lanes-empty-cta-url",
  "dream.services.packages-heading",
  "dream.services.packages-lede",
  "dream.services.cta-heading",
  "dream.services.cta-accent",
  "dream.services.cta-lede",
  "dream.services.cta-label",
  "dream.services.cta-url",
];

/**
 * `/services` — the "Decor, rentals, and draping" index (design.md
 * "Per-page section concepts → Services index"). Each published service is
 * one alternating lane row; package ideas and the closing Estimate Quote
 * band are hideable.
 */
export function DreamServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const raw = customFields as Record<string, unknown> | null | undefined;

  const f = resolveFields(customFields, FIELD_KEYS);

  const logoUrl =
    business.siteContent?.logoUrl ?? "/templates/dream/images/logo.webp";
  const logoAlt = resolveLogoAlt(
    business.siteContent?.logoAltText,
    business.name ?? "",
  );

  // `parseTemplateListRows` reads `customFields` directly and knows nothing
  // of the field's `defaultRows`, so an empty saved list falls back here to
  // the same built-in rows the field declares (`defaultsWhenEmpty`).
  const packageRows = parseTemplateListRows(raw?.["dream.services.packages"]);
  const packages = (
    packageRows.length > 0 ? packageRows : DREAM_PACKAGES_DEFAULT_ROWS
  ).map(toPackageRow);

  return (
    <>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={f["dream.services.hero-heading"] ?? ""}
        accent={f["dream.services.hero-accent"] ?? ""}
        lede={f["dream.services.hero-lede"] ?? ""}
        titleFieldKey="dream.services.hero-heading"
        accentFieldKey="dream.services.hero-accent"
        ledeFieldKey="dream.services.hero-lede"
        sectionAttrs={sectionGroupAttr("services", "hero")}
      />

      <DreamSection
        sectionAttrs={sectionGroupAttr("services", "lanes")}
        aria-label="Services"
        reveal={false}
      >
        {services.length > 0 ? (
          <div>
            {services.map((service, i) => (
              // DreamAlternatingRow styles itself with `[&:first-child]:pt-0`
              // and `last:border-b-0` — both always match when the row is the
              // only child of a reveal div (row pt is always 0, row border is
              // always hidden). So the wrapper takes over the first-row top
              // padding and the hairline: pt-12 on every wrapper but the first,
              // border-b on every wrapper but the last. Row pb-12 still sits
              // above the border, so the rhythm is identical to before.
              <DreamReveal
                key={service.id}
                className="border-b border-[var(--dream-line)] pt-12 first:pt-0 last:border-b-0"
              >
                <DreamServiceLaneRow
                  service={service}
                  index={i}
                  isLast={i === services.length - 1}
                  seeDetailsLabel={
                    f["dream.services.lanes-see-details-label"] ?? ""
                  }
                />
              </DreamReveal>
            ))}
          </div>
        ) : (
          <DreamReveal>
            <DreamEmptyLane
              heading={f["dream.services.lanes-empty-heading"] ?? ""}
              body={f["dream.services.lanes-empty-body"] ?? ""}
              ctaLabel={f["dream.services.lanes-empty-cta-label"] ?? ""}
              ctaUrl={f["dream.services.lanes-empty-cta-url"] ?? ""}
            />
          </DreamReveal>
        )}
      </DreamSection>

      {isSectionVisible(customFields, "dream", "services.packages") && (
        <DreamSection
          id="packages"
          tone="sky"
          className="scroll-mt-[calc(var(--dream-header-h,72px)+24px)]"
          sectionAttrs={sectionGroupAttr("services", "packages")}
        >
          <DreamPackages
            heading={f["dream.services.packages-heading"] ?? ""}
            lede={f["dream.services.packages-lede"] ?? ""}
            packages={packages}
            packagesFieldKey="dream.services.packages"
            headingFieldKey="dream.services.packages-heading"
            ledeFieldKey="dream.services.packages-lede"
          />
        </DreamSection>
      )}

      {isSectionVisible(customFields, "dream", "services.cta") && (
        <DreamQuoteCta
          heading={f["dream.services.cta-heading"] ?? ""}
          accent={f["dream.services.cta-accent"] ?? ""}
          lede={f["dream.services.cta-lede"] ?? ""}
          ctaLabel={f["dream.services.cta-label"] ?? ""}
          ctaUrl={f["dream.services.cta-url"] ?? ""}
          headingFieldKey="dream.services.cta-heading"
          accentFieldKey="dream.services.cta-accent"
          ledeFieldKey="dream.services.cta-lede"
          ctaLabelFieldKey="dream.services.cta-label"
          sectionAttrs={sectionGroupAttr("services", "cta")}
        />
      )}
    </>
  );
}
