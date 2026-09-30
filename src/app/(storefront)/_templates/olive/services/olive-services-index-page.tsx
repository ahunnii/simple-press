import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { OliveClosingBand } from "../generic/olive-closing-band";
import { OliveGatedButton } from "../generic/olive-gated-button";
import { OlivePageBand } from "../generic/olive-page-band";
import { OlivePageSection } from "../generic/olive-page-section";
import {
  hasOliveImage,
  OliveEmptyState,
  OliveImageFallback,
  OliveRevealGroup,
} from "../shared";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  services: RouterOutputs["services"]["getAllPublic"];
};

const FIELD_KEYS = [
  "olive.services.hero-heading",
  "olive.services.hero-body",
  "olive.services.hero-image",
  "olive.services.card-link-label",
  "olive.services.empty-heading",
  "olive.services.empty-body",
  "olive.services.cta-heading",
  "olive.services.cta-body",
  "olive.services.cta-button-label",
  "olive.services.cta-button-link",
];

/** First non-blank string wins (a cleared field resolves to "", not null). */
function firstFilled(...candidates: (string | null | undefined)[]): string {
  return candidates.find((c) => c?.trim()) ?? "";
}

/**
 * `/services` — olive's services index on the generic page base (parity
 * finding PF11 / TP5).
 *
 * - `services.hero`: `OlivePageBand` — the plain white title band, or, with
 *   an owner photo, the cover variant with the title card on the page edge.
 * - `services.list`: one `OlivePageSection` of paper cards in the same card
 *   language as the journal (4:3 photo that pushes in on hover, Josefin
 *   title, caption, ghost link affordance), dealt in as a fanned group. The
 *   whole card is one link to `/services/<slug>`. Empty → the ghost card.
 * - `services.cta` (hideable): the paper `OliveClosingBand`, its button
 *   flag-gated (B2.5).
 *
 * Every section sits on the same left edge (120px at 1440, 16px at 390).
 */
export function OliveServicesIndexPage({ business, services }: Props) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const cardLinkLabel = f["olive.services.card-link-label"] ?? "";

  return (
    <>
      <OlivePageBand
        sectionAttrs={sectionGroupAttr("services", "hero")}
        title={firstFilled(f["olive.services.hero-heading"], "Services")}
        titleFieldKey="olive.services.hero-heading"
        intro={f["olive.services.hero-body"]}
        introFieldKey="olive.services.hero-body"
        image={f["olive.services.hero-image"]}
      />

      <OlivePageSection
        flush={!hasOliveImage(f["olive.services.hero-image"])}
        aria-label="All services"
        sectionAttrs={sectionGroupAttr("services", "list")}
      >
        {services.length === 0 ? (
          <OliveEmptyState
            headingAs="h2"
            className="w-full"
            heading={firstFilled(
              f["olive.services.empty-heading"],
              "Nothing to book just yet.",
            )}
            headingFieldKey="olive.services.empty-heading"
            body={f["olive.services.empty-body"]}
            bodyFieldKey="olive.services.empty-body"
          />
        ) : (
          <OliveRevealGroup
            threshold={0}
            fan
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {services.map((service, i) => (
              <Link
                key={service.id}
                href={`/services/${service.slug}`}
                aria-label={service.name}
                className="olive-card olive-card-paper olive-card-lift olive-reveal-item group flex flex-col overflow-hidden"
                style={{ "--i": Math.min(i, 8) } as CSSProperties}
              >
                <span className="relative block aspect-[4/3] overflow-hidden">
                  {hasOliveImage(service.image) ? (
                    <Image
                      src={service.image!}
                      alt=""
                      fill
                      priority={i < 3}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                      className="olive-photo-push object-cover"
                    />
                  ) : (
                    <OliveImageFallback className="absolute inset-0" />
                  )}
                </span>

                <span className="flex flex-1 flex-col items-start gap-2 p-5">
                  <h2 className="olive-h3">{service.name}</h2>
                  {service.description ? (
                    <span
                      className="olive-caption line-clamp-3"
                      style={{ maxWidth: "60ch" }}
                    >
                      {service.description}
                    </span>
                  ) : null}
                  {cardLinkLabel.trim() ? (
                    <span
                      aria-hidden="true"
                      className="olive-btn olive-btn-ghost olive-btn-sm mt-auto pt-2"
                      {...fieldAttr("olive.services.card-link-label")}
                    >
                      {cardLinkLabel}
                    </span>
                  ) : null}
                </span>
              </Link>
            ))}
          </OliveRevealGroup>
        )}
      </OlivePageSection>

      {isSectionVisible(customFields, "olive", "services.cta") ? (
        <OliveClosingBand
          sectionAttrs={sectionGroupAttr("services", "cta")}
          heading={firstFilled(
            f["olive.services.cta-heading"],
            "Not sure what to book?",
          )}
          headingFieldKey="olive.services.cta-heading"
          body={f["olive.services.cta-body"]}
          bodyFieldKey="olive.services.cta-body"
        >
          <OliveGatedButton
            href={f["olive.services.cta-button-link"] ?? ""}
            label={f["olive.services.cta-button-label"] ?? ""}
            labelFieldKey="olive.services.cta-button-label"
          />
        </OliveClosingBand>
      ) : null}
    </>
  );
}
