import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";

// Default's resolver for the `default.services.*` keys — umsc rendered
// Default's services index until 2026-09-28, and only Default's field map
// knows their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscGatedLink } from "../generic/umsc-gated-link";
import {
  UMSC_META_CLASS,
  UmscClosingBand,
  UmscEmptyState,
} from "../generic/umsc-page-kit";
import { UmscHeading } from "../shared/umsc-heading";
import { resolveUmscHeroPhoto } from "../shared/umsc-hero-fields";
import {
  hasCustomImage,
  UmscImageFallback,
} from "../shared/umsc-image-fallback";
import { UmscLede } from "../shared/umsc-lede";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscReveal, UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";
import { resolveUmscServicesFields } from "./index";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

/**
 * `/services` — umsc's services index on the generic page base (parity
 * PF24). Every section shares `UmscSection`'s container, so the band's h1,
 * the intro and the card grid start on one left edge (B1.7).
 *
 * - `services.hero`: the black `UmscPageHero` — Default's heading + intro
 *   text, and its optional photo beside the text or (with
 *   `umsc.services.hero-image-behind` on) filling the band behind it.
 * - `services.intro` (hideable, cream): optional heading + a 66ch line;
 *   skipped when both are blank (their Default defaults are blank).
 * - `services.list`: 4:5 photo cards in the collection-door language (photo
 *   scales 1.03 on hover, Marcellus name, two-line description, gold-ink
 *   "Explore →"), each one link to `/services/<slug>`; the designed empty
 *   state when none are published.
 * - `services.cta` (hideable): the black closing band, its pill flag-gated
 *   (B2.5).
 */
export function UmscServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const d = resolveDefaultFields(customFields, [
    "default.services.hero-heading",
    "default.services.hero-tagline",
    "default.services.intro-heading",
    "default.services.intro-body",
    "default.services.cta-heading",
    "default.services.cta-button-text",
    "default.services.cta-button-link",
  ]);
  const f = resolveUmscServicesFields(customFields, [
    "umsc.services.card-link-label",
    "umsc.services.empty-heading",
    "umsc.services.empty-body",
    // The band photo: Default's inherited image key + umsc's placement switch.
    "default.services.hero-image",
    "umsc.services.hero-image-behind",
  ]);

  const heading = nonBlank(d["default.services.hero-heading"]) ?? "Services";
  const introHeading = nonBlank(d["default.services.intro-heading"]);
  const introBody = nonBlank(d["default.services.intro-body"]);
  const showIntro =
    (!!introHeading || !!introBody) &&
    isSectionVisible(customFields, "umsc", "services.intro");
  const cardLinkLabel = nonBlank(f["umsc.services.card-link-label"]);

  return (
    <PageTransition>
      <UmscPageHero
        heading={heading}
        headingFieldKey="default.services.hero-heading"
        lede={d["default.services.hero-tagline"] ?? ""}
        ledeFieldKey="default.services.hero-tagline"
        {...resolveUmscHeroPhoto(f, "services", "default.services.hero-image")}
        sectionAttrs={sectionGroupAttr("services", "hero")}
      />

      {showIntro ? (
        <UmscSection
          tone="cream"
          aria-label={introHeading ?? heading}
          sectionAttrs={sectionGroupAttr("services", "intro")}
        >
          <UmscReveal className="flex flex-col gap-5">
            {introHeading ? (
              <UmscHeading as="h2" fieldKey="default.services.intro-heading">
                {introHeading}
              </UmscHeading>
            ) : null}
            {introBody ? (
              <UmscLede fieldKey="default.services.intro-body">
                {introBody}
              </UmscLede>
            ) : null}
          </UmscReveal>
        </UmscSection>
      ) : null}

      <UmscSection
        tone="paper"
        aria-label="All services"
        sectionAttrs={sectionGroupAttr("services", "list")}
      >
        {services.length === 0 ? (
          <UmscEmptyState
            heading={
              nonBlank(f["umsc.services.empty-heading"]) ??
              "Services are on their way."
            }
            headingFieldKey="umsc.services.empty-heading"
            body={f["umsc.services.empty-body"]}
            bodyFieldKey="umsc.services.empty-body"
          />
        ) : (
          <UmscRevealGroup className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <div
                key={service.id}
                className="umsc-reveal-item min-w-0"
                style={{ "--i": Math.min(i, 6) } as CSSProperties}
              >
                <Link
                  href={`/services/${service.slug}`}
                  className="umsc-product-card group block text-[var(--umsc-ink)] no-underline"
                >
                  <div
                    className="relative w-full overflow-hidden border border-[var(--umsc-line)] bg-[var(--umsc-cream)]"
                    style={{ aspectRatio: "4 / 5" }}
                  >
                    {hasCustomImage(service.image) ? (
                      <Image
                        src={service.image!}
                        alt=""
                        fill
                        priority={i < 3}
                        className="umsc-product-card-img object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                      />
                    ) : (
                      <UmscImageFallback className="border-0" />
                    )}
                  </div>
                  <h2 className="umsc-serif mt-5 text-[24px] leading-[1.2] font-normal tracking-[0.015em] text-balance break-words">
                    {service.name}
                  </h2>
                  {service.description ? (
                    <p className="umsc-sans mt-2 line-clamp-3 max-w-[60ch] text-[15px] leading-[1.6] text-[var(--umsc-muted)]">
                      {service.description}
                    </p>
                  ) : null}
                  {cardLinkLabel ? (
                    <span
                      className={cn(
                        UMSC_META_CLASS,
                        "mt-3 inline-flex items-center gap-1.5 text-[var(--umsc-gold-ink)]",
                      )}
                    >
                      <span
                        {...(i === 0
                          ? fieldAttr("umsc.services.card-link-label")
                          : {})}
                      >
                        {cardLinkLabel}
                      </span>
                      <span aria-hidden="true" className="umsc-door-arrow">
                        →
                      </span>
                    </span>
                  ) : null}
                </Link>
              </div>
            ))}
          </UmscRevealGroup>
        )}
      </UmscSection>

      {isSectionVisible(customFields, "umsc", "services.cta") ? (
        <UmscClosingBand
          sectionAttrs={sectionGroupAttr("services", "cta")}
          heading={d["default.services.cta-heading"] ?? ""}
          headingFieldKey="default.services.cta-heading"
        >
          <UmscGatedLink
            href={d["default.services.cta-button-link"] ?? ""}
            label={d["default.services.cta-button-text"] ?? ""}
            labelFieldKey="default.services.cta-button-text"
          />
        </UmscClosingBand>
      ) : null}
    </PageTransition>
  );
}
