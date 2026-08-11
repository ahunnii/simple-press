import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { RelocationTestimonialCarousel } from "../shared/relocation-testimonial-carousel";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";

/**
 * Reviews (`/testimonials`) — design.md → "Per-page section concepts →
 * Reviews":
 *
 *  1. Wave hero (tall) — "Reviews" + "Hear what our customers have to say
 *     about us!" + CALL US TODAY. Deviation #1 (user-approved 2026-08-10):
 *     the source's flat charcoal hero is replaced with the standard
 *     terracotta wave, matching every other inner page.
 *  2. Testimonials — right-aligned "Our Client Testimonials!" heading over
 *     the shared salmon-arrow carousel, fed by approved+visible DB rows
 *     (`api.testimonial.list({ publicOnly: true })` already scopes to
 *     `isApproved && !isHidden` server-side — see `testimonials.ts` router).
 *     A designed empty state replaces the carousel until the business has
 *     its first approved review, rather than rendering a blank band.
 *  3. Credentials band (global, full heading — no homepage-style override).
 *
 * The route (`src/app/(storefront)/testimonials/page.tsx`) already 404s when
 * the `testimonials` feature flag is off, so this page can fetch directly —
 * same as `BuildersTestimonialsPage`.
 */

const FIELD_KEYS = [
  "relocation.testimonials.hero-heading",
  "relocation.testimonials.hero-subheading",
  "relocation.testimonials.hero-cta-label",
  "relocation.global.branding.phone-href",
  "relocation.testimonials.list-heading",
  "relocation.testimonials.empty-heading",
  "relocation.testimonials.empty-body",
] as const;

export async function RelocationTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, [...FIELD_KEYS]);

  const isVisible = (sectionId: string) =>
    isSectionVisible(customFields, "relocation", sectionId);

  const testimonials = await api.testimonial.list({ publicOnly: true });
  const carouselRows = testimonials.map((t) => ({
    id: t.id,
    text: t.text,
    customerName: t.customerName,
  }));

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.testimonials.hero-heading"] ?? ""}
        subtitle={f["relocation.testimonials.hero-subheading"] ?? ""}
        ctaLabel={f["relocation.testimonials.hero-cta-label"] ?? ""}
        ctaHref={f["relocation.global.branding.phone-href"] ?? ""}
        size="tall"
        sectionAttrs={sectionGroupAttr("testimonials", "hero")}
        titleFieldAttrs={fieldAttr("relocation.testimonials.hero-heading")}
        subtitleFieldAttrs={fieldAttr(
          "relocation.testimonials.hero-subheading",
        )}
        ctaFieldAttrs={fieldAttr("relocation.testimonials.hero-cta-label")}
      />

      {isVisible("testimonials.list") ? (
        <section
          {...sectionGroupAttr("testimonials", "list")}
          aria-labelledby="relocation-testimonials-list-heading"
          className="w-full bg-[var(--relocation-paper)] py-14 min-[1025px]:py-21"
        >
          <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
            <RelocationReveal>
              <RelocationSectionHeading
                id="relocation-testimonials-list-heading"
                dark
                fieldAttrs={fieldAttr("relocation.testimonials.list-heading")}
                className="text-right text-[2.8125rem] leading-[3.375rem] min-[1025px]:text-[4rem] min-[1025px]:leading-[4.8125rem]"
              >
                {f["relocation.testimonials.list-heading"] ?? ""}
              </RelocationSectionHeading>
            </RelocationReveal>

            {carouselRows.length > 0 ? (
              <RelocationReveal className="mt-12 min-[1025px]:mt-16">
                <RelocationTestimonialCarousel testimonials={carouselRows} />
              </RelocationReveal>
            ) : (
              <RelocationReveal className="mt-12 min-[1025px]:mt-16">
                <div className="flex flex-col items-center gap-3 bg-[var(--relocation-card)] px-8 py-16 text-center">
                  <p
                    {...fieldAttr("relocation.testimonials.empty-heading")}
                    className="[font-family:var(--font-relocation-display)] text-[1.6875rem] font-semibold text-[var(--relocation-charcoal)]"
                  >
                    {f["relocation.testimonials.empty-heading"] ?? ""}
                  </p>
                  <p
                    {...fieldAttr("relocation.testimonials.empty-body")}
                    className="max-w-[28rem] [font-family:var(--font-relocation-body)] text-[1.125rem] leading-[1.8125rem] text-[var(--relocation-ink)]"
                  >
                    {f["relocation.testimonials.empty-body"] ?? ""}
                  </p>
                </div>
              </RelocationReveal>
            )}
          </div>
        </section>
      ) : null}

      <RelocationCredentialsBand customFields={customFields} />
    </>
  );
}
