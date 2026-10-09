import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { GloveEmptyState } from "../generic/glove-empty-state";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import {
  GloveButton,
  GloveHandIcon,
  GloveHeading,
  GloveRevealGroup,
  gloveRevealItemStyle,
  GloveSection,
} from "../shared";
import { gloveIsExternal, gloveLinkAllowed } from "../steps/glove-links";
import { hasGloveImage } from "./has-glove-image";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "glove.services.hero-heading",
  "glove.services.hero-subtitle",
  "glove.services.list-card-link",
  "glove.services.list-empty-heading",
  "glove.services.list-empty-body",
  "glove.services.cta-heading",
  "glove.services.cta-body",
  "glove.services.cta-button-label",
  "glove.services.cta-button-link",
];

/**
 * `/services` — glove's services index on the generic page base (parity
 * finding PF1 / TP2).
 *
 * - `services.hero`: the banner title band (page's only h1, breadcrumb inside),
 *   exactly as on GenericPage / Blog / Events.
 * - `services.list`: a full-container 3-col grid (2 at tablet, 1 on phones)
 *   of cards in the blog-card language — 12px-radius 4:3 photo (mist panel +
 *   glove glyph when the service has none), Poppins title, Lato blurb,
 *   purple "View service →". The title link is stretched over the card so
 *   each card is one tab stop. Empty → `GloveEmptyState`.
 * - `services.cta` (hideable): the purple closing banner, its button gated
 *   by the target route's feature flag (B2.5: hidden, never re-pointed).
 *
 * The breadcrumb, grid and banner all sit on the 1222px container edge
 * (133–1307 at 1440) — one left edge (B1.7).
 */
export async function GloveServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);
  const get = (key: string) => f[key] ?? "";

  const heading = get("glove.services.hero-heading").trim() || "Services";
  const cardLink = get("glove.services.list-card-link").trim();

  const { isEnabled } = await getBusinessFlags();
  const ctaHeading = get("glove.services.cta-heading").trim();
  const ctaBody = get("glove.services.cta-body").trim();
  const ctaLabel = get("glove.services.cta-button-label").trim();
  const ctaHref = get("glove.services.cta-button-link").trim();
  const showCtaButton =
    ctaLabel.length > 0 && gloveLinkAllowed(ctaHref, isEnabled);
  const showCta =
    isSectionVisible(customFields, "glove", "services.cta") &&
    ctaHeading.length > 0;

  return (
    <GloveGeneralLayout
      bandVariant="banner"
      title={heading}
      titleFieldKey="glove.services.hero-heading"
      subtitle={get("glove.services.hero-subtitle")}
      subtitleFieldKey="glove.services.hero-subtitle"
      breadcrumb={[{ label: "Home", href: "/" }, { label: heading }]}
      sectionAttrs={sectionGroupAttr("services", "hero")}
    >
      <GloveSection
        tone="paper"
        aria-label={heading}
        sectionAttrs={sectionGroupAttr("services", "list")}
        // The grid carries its own stagger group.
        reveal={false}
      >
        {services.length === 0 ? (
          <GloveEmptyState
            heading={get("glove.services.list-empty-heading")}
            headingFieldKey="glove.services.list-empty-heading"
            body={get("glove.services.list-empty-body")}
            bodyFieldKey="glove.services.list-empty-body"
          />
        ) : (
          <GloveRevealGroup
            threshold={0}
            className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((service, i) => (
              <article
                key={service.id}
                className="glove-reveal-item group relative flex h-full flex-col"
                style={gloveRevealItemStyle(i % 9)}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[12px] bg-[var(--glove-mist)]">
                  {hasGloveImage(service.image) ? (
                    <Image
                      src={service.image}
                      alt=""
                      fill
                      priority={i < 3}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[var(--glove-primary)]/60">
                      <GloveHandIcon className="size-14" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col pt-5">
                  <h2 className="glove-display text-[20px] leading-[1.3] font-medium text-[var(--glove-ink)]">
                    <Link
                      href={`/services/${service.slug}`}
                      className="transition-colors group-hover:text-[var(--glove-primary)] after:absolute after:inset-0 after:content-['']"
                    >
                      {service.name}
                    </Link>
                  </h2>
                  {service.description ? (
                    <p className="glove-body mt-2 line-clamp-3 text-[15px] leading-relaxed text-[var(--glove-text)]">
                      {service.description}
                    </p>
                  ) : null}
                  {cardLink ? (
                    <span
                      aria-hidden="true"
                      className="glove-display mt-4 inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.5px] text-[var(--glove-primary)] transition-[gap] duration-200 group-hover:gap-3 motion-reduce:transition-none"
                    >
                      <span {...fieldAttr("glove.services.list-card-link")}>
                        {cardLink}
                      </span>
                      <span>→</span>
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </GloveRevealGroup>
        )}
      </GloveSection>

      {showCta ? (
        <GloveSection
          tone="primary"
          aria-label={ctaHeading}
          sectionAttrs={sectionGroupAttr("services", "cta")}
          revealThreshold={0}
        >
          <div className="mx-auto max-w-2xl text-center">
            <GloveHeading
              as="h2"
              tone="light"
              fieldKey="glove.services.cta-heading"
            >
              {ctaHeading}
            </GloveHeading>
            {ctaBody ? (
              <p
                className="glove-body mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--glove-on-plum-soft)] md:text-[18px]"
                {...fieldAttr("glove.services.cta-body")}
              >
                {ctaBody}
              </p>
            ) : null}
            {showCtaButton ? (
              <div className="mt-8">
                <GloveButton
                  href={ctaHref}
                  external={gloveIsExternal(ctaHref)}
                  variant="woo"
                  size="lg"
                  onDark
                >
                  <span {...fieldAttr("glove.services.cta-button-label")}>
                    {ctaLabel}
                  </span>
                </GloveButton>
              </div>
            ) : null}
          </div>
        </GloveSection>
      ) : null}
    </GloveGeneralLayout>
  );
}
