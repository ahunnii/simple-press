import type { RouterOutputs } from "~/trpc/react";
import { resolveLogoAlt } from "~/lib/logo-alt";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamQuoteCta } from "../shared/dream-quote-cta";
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

  const packageRows = parseTemplateListRows(raw?.["dream.services.packages"]);
  const packages = (
    packageRows.length > 0 ? packageRows : DEFAULT_PACKAGE_ROWS
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
      >
        {services.length > 0 ? (
          <div>
            {services.map((service, i) => (
              <DreamServiceLaneRow
                key={service.id}
                service={service}
                index={i}
                isLast={i === services.length - 1}
                seeDetailsLabel={
                  f["dream.services.lanes-see-details-label"] ?? ""
                }
              />
            ))}
          </div>
        ) : (
          <DreamEmptyLane
            heading={f["dream.services.lanes-empty-heading"] ?? ""}
            body={f["dream.services.lanes-empty-body"] ?? ""}
            ctaLabel={f["dream.services.lanes-empty-cta-label"] ?? ""}
            ctaUrl={f["dream.services.lanes-empty-cta-url"] ?? "/contact"}
          />
        )}
      </DreamSection>

      {isSectionVisible(customFields, "dream", "services.packages") && (
        <DreamSection
          tone="sky"
          sectionAttrs={sectionGroupAttr("services", "packages")}
        >
          <DreamPackages
            heading={f["dream.services.packages-heading"] ?? ""}
            lede={f["dream.services.packages-lede"] ?? ""}
            packages={packages}
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
          ctaUrl={f["dream.services.cta-url"] ?? "/contact"}
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

// `parseTemplateListRows` ignores a list field's `defaultValue` (it reads
// `customFields` directly), so a fresh business needs a real hardcoded
// fallback here or the packages grid renders empty — mirrors
// `wealth-essay-service-page.tsx`'s `DEFAULT_PRIORITIES` pattern. Must stay
// in sync with `dream.services.packages`'s `defaultValue` in `./index.ts`.
const DEFAULT_PACKAGE_ROWS: Parameters<typeof toPackageRow>[0][] = [
  {
    name: "Essence",
    tagline: "A simple, elegant start.",
    includes: "1 panel\n3 colors\n2 layers\n2 tie backs",
    note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
  },
  {
    name: "Deluxe",
    tagline: "Full and finished with a theme.",
    includes: "1 panel\na theme\n3–5 colors\nvalance",
    note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
  },
  {
    name: "Premium",
    tagline: "Deluxe, plus a throne chair moment.",
    includes: "Deluxe package\n2 panels\nthrone chair",
    note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
  },
  {
    name: "Lavish",
    tagline: "Dressed for a full guest list.",
    includes: "up to 50 guests\nchair covers\ntable cloths",
    note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
  },
  {
    name: "Yasss!",
    tagline: "Big, bright, and ready to celebrate.",
    includes: "backdrop\nballoon garland\nthrone chair\ngift tables",
    note: "Inquiry-only; delivery, setup, and teardown quoted separately.",
  },
];
