import type { DefaultFaqPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { RelocationCredentialsBand } from "../shared/relocation-credentials-band";
import { RelocationReveal } from "../shared/relocation-reveal";
import { RelocationSectionHeading } from "../shared/relocation-section-heading";
import { RelocationWaveHero } from "../shared/relocation-wave-hero";
import { RelocationFaqAccordion } from "./relocation-faq-accordion";

/**
 * Handy Relocations — FAQ page (`/faq`).
 *
 * Structure follows the reference screenshot
 * (docs/relocation/"FAQ _ Handy Relocations.jpeg"):
 *   1. Wave hero — "Frequently Asked Questions" + compiled-questions blurb +
 *      outlined CALL US TODAY, dialling the header's global phone link.
 *   2. Centered "FAQs" heading, then the accordion in a narrow centered column
 *      of hairline-separated rows.
 *   3. Shared credentials band.
 *
 * `items` are `FaqItem` DB rows fetched by the route, which also emits the FAQ
 * JSON-LD — this component must not duplicate that structured data.
 */
export function RelocationFaqPage({
  business,
  items,
}: DefaultFaqPageTemplateProps) {
  const customFields = business.siteContent?.customFields;

  const f = resolveFields(customFields, [
    "relocation.faq.hero-heading",
    "relocation.faq.hero-subheading",
    "relocation.faq.hero-cta-label",
    "relocation.faq.list-heading",
    "relocation.faq.empty-message",
    "relocation.global.branding.phone-href",
  ]);

  const listHeading = f["relocation.faq.list-heading"] ?? "";
  const emptyMessage = f["relocation.faq.empty-message"] ?? "";

  return (
    <>
      <RelocationWaveHero
        title={f["relocation.faq.hero-heading"] ?? ""}
        subtitle={f["relocation.faq.hero-subheading"] ?? ""}
        ctaLabel={f["relocation.faq.hero-cta-label"] ?? ""}
        ctaHref={f["relocation.global.branding.phone-href"] ?? ""}
        size="tall"
        sectionAttrs={sectionGroupAttr("faq", "hero")}
        titleFieldAttrs={fieldAttr("relocation.faq.hero-heading")}
        subtitleFieldAttrs={fieldAttr("relocation.faq.hero-subheading")}
        ctaFieldAttrs={fieldAttr("relocation.faq.hero-cta-label")}
      />

      <section
        {...sectionGroupAttr("faq", "list")}
        aria-labelledby={
          listHeading === "" ? undefined : "relocation-faq-list-heading"
        }
        aria-label={
          listHeading === "" ? "Frequently asked questions" : undefined
        }
        className="w-full bg-[var(--relocation-paper)] py-16 min-[1025px]:py-24"
      >
        <div className="mx-auto w-full max-w-[85rem] px-6 min-[572px]:px-10 min-[1025px]:px-16">
          {listHeading === "" ? null : (
            <RelocationReveal>
              <RelocationSectionHeading
                id="relocation-faq-list-heading"
                dark
                fieldAttrs={fieldAttr("relocation.faq.list-heading")}
                // The screenshot renders "FAQs" centered at the hero scale
                // (4rem), a step above the standard section heading.
                className="text-center text-[2.8125rem] leading-[3rem] min-[1025px]:text-[4rem] min-[1025px]:leading-[4.25rem]"
              >
                {listHeading}
              </RelocationSectionHeading>
            </RelocationReveal>
          )}

          <div className="mx-auto mt-14 w-full max-w-[46rem] min-[1025px]:mt-20">
            {items.length === 0 ? (
              <RelocationReveal>
                <p
                  {...fieldAttr("relocation.faq.empty-message")}
                  className="text-center [font-family:var(--font-relocation-display)] font-bold text-[var(--relocation-ink)]"
                >
                  {emptyMessage}
                </p>
              </RelocationReveal>
            ) : (
              <RelocationReveal>
                <RelocationFaqAccordion
                  items={items.map((item) => ({
                    id: item.id,
                    question: item.question,
                    answer: item.answer,
                  }))}
                />
              </RelocationReveal>
            )}
          </div>
        </div>
      </section>

      <RelocationCredentialsBand customFields={customFields} />
    </>
  );
}
