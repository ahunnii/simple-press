import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseClosingBand } from "../generic/noise-closing-band";
import { NoiseEmptyState } from "../generic/noise-empty-state";
import { NoiseGatedLink } from "../generic/noise-gated-link";
import {
  NOISE_HATCH_BACKGROUND,
  NOISE_META_CLASS,
  NoisePageBand,
  NoisePageBody,
} from "../generic/noise-page-shell";
import { nonBlank } from "../shared/noise-non-blank";
import { resolveServicesFields, SERVICES_COPY } from "./index";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "noise.services.hero-overline",
  "noise.services.hero-heading",
  "noise.services.hero-intro",
  "noise.services.card-link-label",
  "noise.services.empty-heading",
  "noise.services.empty-body",
  "noise.services.cta-overline",
  "noise.services.cta-heading",
  "noise.services.cta-body",
  "noise.services.cta-button-label",
  "noise.services.cta-button-link",
];

/** A real photo, not blank or the stock placeholder. */
function hasImage(src: string | null | undefined): src is string {
  const value = src?.trim();
  return !!value && !value.endsWith("/placeholder.svg");
}

/**
 * `/services` — noise's services index on the generic page base (PF13).
 *
 * - `services.hero`: the centred title band (mono overline, italic h1,
 *   intro).
 * - `services.list`: the blog grid's card language on the wide container —
 *   an ink-framed 4:3 photo (the hatched tile when there is none) that
 *   pushes in on hover, a mono index, an italic Cormorant title, a
 *   two-line description and a mono "See details →". The whole card is one
 *   link to `/services/<slug>`. Empty → the designed empty state.
 * - `services.cta` (hideable): the ink closing band, its button flag-gated
 *   (B2.5).
 */
export function NoiseServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveServicesFields(customFields, FIELD_KEYS);

  const cardLinkLabel = nonBlank(f["noise.services.card-link-label"]);

  return (
    <PageTransition>
      <NoisePageBand
        sectionAttrs={sectionGroupAttr("services", "hero")}
        overline={f["noise.services.hero-overline"]}
        overlineFieldKey="noise.services.hero-overline"
        title={
          nonBlank(f["noise.services.hero-heading"]) ??
          SERVICES_COPY.heroHeading
        }
        titleFieldKey="noise.services.hero-heading"
        intro={f["noise.services.hero-intro"]}
        introFieldKey="noise.services.hero-intro"
      />

      <NoisePageBody
        width="wide"
        aria-label="All services"
        sectionAttrs={sectionGroupAttr("services", "list")}
      >
        {services.length === 0 ? (
          <NoiseEmptyState
            heading={
              nonBlank(f["noise.services.empty-heading"]) ??
              SERVICES_COPY.emptyHeading
            }
            headingFieldKey="noise.services.empty-heading"
            body={f["noise.services.empty-body"]}
            bodyFieldKey="noise.services.empty-body"
          />
        ) : (
          <StaggerContainer
            className="grid grid-cols-1 gap-x-6 gap-y-12 border-t-2 border-(--vn-ink) pt-12 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {services.map((service, i) => (
              <StaggerItem key={service.id} className="min-w-0">
                <Link
                  href={`/services/${service.slug}`}
                  aria-label={service.name}
                  className="group block"
                >
                  <span
                    className="relative block overflow-hidden border border-(--vn-ink)"
                    style={{ aspectRatio: "4/3" }}
                  >
                    {hasImage(service.image) ? (
                      <Image
                        src={service.image}
                        alt=""
                        fill
                        priority={i < 3}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: NOISE_HATCH_BACKGROUND }}
                      >
                        <span
                          className="font-serif italic select-none"
                          style={{
                            fontSize: "64px",
                            color: "var(--vn-bone)",
                            opacity: 0.3,
                          }}
                        >
                          {String.fromCharCode(0x2160 + (i % 6))}
                        </span>
                      </span>
                    )}
                  </span>

                  <span
                    aria-hidden="true"
                    className={`mt-4 block ${NOISE_META_CLASS}`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <h2
                    className="mt-2.5 font-serif leading-[1.15] tracking-tight break-words italic transition-opacity group-hover:opacity-70"
                    style={{ fontSize: "24px", letterSpacing: "-0.005em" }}
                  >
                    {service.name}
                  </h2>

                  {service.description ? (
                    <span className="mt-2 line-clamp-2 block font-sans text-sm leading-relaxed text-(--vn-steel-mist)">
                      {service.description}
                    </span>
                  ) : null}

                  {cardLinkLabel ? (
                    <span
                      aria-hidden="true"
                      className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-(--vn-ink) uppercase transition-opacity group-hover:opacity-60"
                    >
                      <span {...fieldAttr("noise.services.card-link-label")}>
                        {cardLinkLabel}
                      </span>
                      <span>→</span>
                    </span>
                  ) : null}
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </NoisePageBody>

      {isSectionVisible(customFields, "noise", "services.cta") ? (
        <NoiseClosingBand
          sectionAttrs={sectionGroupAttr("services", "cta")}
          overline={f["noise.services.cta-overline"]}
          overlineFieldKey="noise.services.cta-overline"
          heading={f["noise.services.cta-heading"] ?? ""}
          headingFieldKey="noise.services.cta-heading"
          body={f["noise.services.cta-body"]}
          bodyFieldKey="noise.services.cta-body"
        >
          <NoiseGatedLink
            href={f["noise.services.cta-button-link"] ?? ""}
            label={f["noise.services.cta-button-label"] ?? ""}
            labelFieldKey="noise.services.cta-button-label"
          />
        </NoiseClosingBand>
      ) : null}
    </PageTransition>
  );
}
