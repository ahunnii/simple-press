import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { routeEnabled, routeFlags } from "~/lib/features/route-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { renderBoldMarkup } from "../homepage/wealth-bold-markup";
import { WealthBlock } from "../shared/wealth-block";
import { WealthCtaBand } from "../shared/wealth-cta-band";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import {
  WEALTH_PROGRAM_TONES,
  WealthProgramCard,
} from "../shared/wealth-program-card";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";
import { wealthServicesData } from "./index";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "wealth.services.hero-heading",
  "wealth.services.hero-intro",
  "wealth.services.hero-leadin",
  "wealth.services.hero-image",
  "wealth.services.hero-image-alt",
  "wealth.services.grid-empty-message",
  "wealth.services.grid-empty-cta-label",
  "wealth.services.grid-empty-cta-url",
  "wealth.services.cta-heading",
  "wealth.services.cta-label",
  "wealth.services.cta-url",
];

/** An owner who blanks the heading still gets the page's one <h1>: fall back
 *  to the field's own declared default (no second copy of the string). */
const HEADING_DEFAULT =
  wealthServicesData.find(
    (field) => field.key === "wealth.services.hero-heading",
  )?.defaultValue ?? "";

/**
 * Programs index (`/services`) — redesign pass 2 (2026-10-12):
 *   1. forest hero (optional photo), 2. centered lead-in, 3. one solid color
 *   program card per service record (forest / primary / sage / surface,
 *   cycling) or the designed empty state, 4. forest closing CTA band.
 * Service photos are intentionally not used on the index (detail pages show
 * them). Server component.
 */
export async function WealthServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const heading =
    (f["wealth.services.hero-heading"] ?? "").trim() || HEADING_DEFAULT;
  const intro = (f["wealth.services.hero-intro"] ?? "").trim();
  const leadin = (f["wealth.services.hero-leadin"] ?? "").trim();
  const heroImage = (f["wealth.services.hero-image"] ?? "").trim();

  const emptyCtaLabel = (
    f["wealth.services.grid-empty-cta-label"] ?? ""
  ).trim();
  const emptyCtaUrl =
    (f["wealth.services.grid-empty-cta-url"] ?? "").trim() || "/contact";
  const ctaHeading = (f["wealth.services.cta-heading"] ?? "").trim();
  const ctaLabel = (f["wealth.services.cta-label"] ?? "").trim();
  const ctaUrl = f["wealth.services.cta-url"] ?? "";

  // An owner-typed link to a feature that is switched off would 404: drop the
  // button instead. Flags are only fetched when a link actually points at a
  // gated route (a plain /contact default needs no lookup beyond its flag).
  const gated = [emptyCtaUrl, ctaUrl].some((h) => routeFlags(h).length > 0);
  const isEnabled = gated ? (await getBusinessFlags()).isEnabled : () => true;
  const emptyCtaLive = routeEnabled(emptyCtaUrl, isEnabled);
  const ctaLive = ctaUrl !== "" && routeEnabled(ctaUrl, isEnabled);
  const showCtaButton = ctaLabel !== "" && ctaLive;

  const hasCards = services.length > 0;
  const showCta =
    (ctaHeading !== "" || showCtaButton) &&
    isSectionVisible(customFields, "wealth", "services.cta");
  // 3-up desktop when the count divides evenly into threes, else 2-up.
  const threeUp = services.length === 3 || services.length === 6;

  return (
    <>
      {/* ── 1. Hero — not hideable: owns the page's sole <h1> ───────────── */}
      <WealthSplitHero
        ratio="sixty"
        image={heroImage || null}
        imageAlt={f["wealth.services.hero-image-alt"] ?? ""}
        aria-labelledby="wealth-services-title"
        className="wealth-services-hero"
        {...sectionGroupAttr("services", "hero")}
      >
        <WealthReveal>
          <h1
            id="wealth-services-title"
            className="wealth-hero__title"
            {...fieldAttr("wealth.services.hero-heading")}
          >
            {heading}
          </h1>
        </WealthReveal>
        {intro ? (
          <WealthReveal delay={1}>
            <p
              className="wealth-hero__excerpt"
              {...fieldAttr("wealth.services.hero-intro")}
            >
              {intro}
            </p>
          </WealthReveal>
        ) : null}
      </WealthSplitHero>

      {/* ── 2. Lead-in — still the `services.hero` group ───────────────── */}
      {leadin ? (
        <WealthBlock
          tone="paper"
          container="narrow"
          spacing={hasCards ? "flush-bottom" : "default"}
          className="wealth-services-intro"
          {...sectionGroupAttr("services", "hero")}
        >
          <WealthReveal className="wealth-center">
            {/* No fieldAttr: transformed text (`**` → <strong>). */}
            <p className="wealth-lead">{renderBoldMarkup(leadin)}</p>
          </WealthReveal>
        </WealthBlock>
      ) : null}

      {/* ── 3. Program cards — or the designed empty state ──────────────── */}
      {hasCards ? (
        <WealthBlock
          tone="paper"
          aria-label="Programs"
          className="wealth-services-list"
          {...sectionGroupAttr("services", "grid")}
        >
          <WealthRevealGroup
            threshold={0}
            className={
              threeUp
                ? "wealth-services-cards wealth-services-cards--3"
                : "wealth-services-cards"
            }
          >
            {services.map((service, i) => {
              const tone =
                WEALTH_PROGRAM_TONES[i % WEALTH_PROGRAM_TONES.length] ??
                "forest";
              return (
                <WealthProgramCard
                  key={service.id}
                  className="wealth-reveal-item"
                  style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
                  tone={tone}
                  titleAs="h2"
                  number={String(i + 1).padStart(2, "0")}
                  title={service.name}
                  copy={service.description}
                  cta={{
                    href: `/services/${service.slug}`,
                    label: (
                      <>
                        Learn more
                        <span className="sr-only"> about {service.name}</span>
                      </>
                    ),
                  }}
                />
              );
            })}
          </WealthRevealGroup>
        </WealthBlock>
      ) : (
        <WealthBlock
          tone="surface"
          container="narrow"
          aria-label="Programs"
          className="wealth-services-empty"
          {...sectionGroupAttr("services", "grid")}
        >
          <WealthReveal className="wealth-center">
            <p
              className="wealth-lead"
              {...fieldAttr("wealth.services.grid-empty-message")}
            >
              {f["wealth.services.grid-empty-message"] ?? ""}
            </p>
            {emptyCtaLabel !== "" && emptyCtaLive ? (
              <div className="wealth-btn-row wealth-btn-row--center wealth-services-empty__cta">
                <WealthLedgeButton href={emptyCtaUrl}>
                  <span {...fieldAttr("wealth.services.grid-empty-cta-label")}>
                    {emptyCtaLabel}
                  </span>
                </WealthLedgeButton>
              </div>
            ) : null}
          </WealthReveal>
        </WealthBlock>
      )}

      {/* ── 4. Closing CTA band — hideable ─────────────────────────────── */}
      {showCta ? (
        <WealthReveal>
          <WealthCtaBand
            aria-labelledby={ctaHeading ? "wealth-services-cta-h" : undefined}
            headingId="wealth-services-cta-h"
            heading={ctaHeading}
            headingProps={fieldAttr("wealth.services.cta-heading")}
            action={
              showCtaButton ? (
                <WealthLedgeButton onDark href={ctaUrl}>
                  <span {...fieldAttr("wealth.services.cta-label")}>
                    {ctaLabel}
                  </span>
                </WealthLedgeButton>
              ) : undefined
            }
            {...sectionGroupAttr("services", "cta")}
          />
        </WealthReveal>
      ) : null}
    </>
  );
}
