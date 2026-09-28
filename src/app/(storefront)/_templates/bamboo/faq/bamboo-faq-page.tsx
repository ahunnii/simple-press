import { HelpCircle } from "lucide-react";

import type { DefaultFaqPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
// Default's resolver + fallbacks, not bamboo's: this page keeps reading the
// existing `default.faq.*` keys, and only Default's field map knows their
// `defaultValue`s — bamboo's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import {
  BambooAccordion,
  BambooAccordionItem,
} from "../shared/bamboo-accordion";
import { BambooPageHero } from "../shared/bamboo-page-hero";

/**
 * `/faq` — bamboo's FAQ page on the generic page's base. The heading moves
 * into the shared `BambooPageHero` band (the page's only h1; the band carries
 * `BAMBOO_TOP_MARKER`), and the questions render as bamboo's own hairline
 * accordion cards (`shared/bamboo-accordion.tsx`, the contact-page FAQ
 * treatment) in a left-aligned `max-w-3xl` column on the band's container
 * edge (B1.2/B1.7).
 *
 * Data logic is Default's FAQ page's: heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks, the "Answers to common questions about
 * <business>" line only when there are questions, and every item
 * independently expandable. No `<main>` here (Default's page renders one):
 * bamboo's layout already wraps every page in `#bamboo-main-content`.
 *
 * `faq.page` covers both the heading (in the band) and the empty-state line
 * (in the body), so its `sectionGroupAttr` sits on a wrapper around both,
 * as Default's sits on its whole `<main>`.
 */
export function BambooFaqPage({
  business,
  items,
}: DefaultFaqPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveDefaultFields(customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;
  // Generic-base parity: the site-wide page-hero photo applies here exactly
  // as it does on generic CMS pages (no per-page override field).
  const heroBgImage = resolveFields(customFields, [
    "bamboo.global.page-hero-bg-image",
  ])["bamboo.global.page-hero-bg-image"];

  return (
    <PageTransition>
      <div {...sectionGroupAttr("faq", "page")}>
        <BambooPageHero
          title={pageHeading}
          titleFieldKey="default.faq.page-heading"
          lede={
            items.length > 0
              ? `Answers to common questions about ${business.name}.`
              : null
          }
          bgImage={heroBgImage}
        />

        {/* Cream body — declares no background. */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            {items.length === 0 ? (
              <FadeIn direction="up">
                <div className="bg-card flex max-w-3xl flex-col items-center rounded-2xl border border-[var(--bam-hairline)] px-6 py-16 text-center md:py-20">
                  <div className="flex size-16 items-center justify-center rounded-full border border-[var(--bam-gold)]/40 bg-[var(--bam-gold)]/10">
                    <HelpCircle
                      className="size-7 text-[var(--bam-forest)]"
                      aria-hidden="true"
                    />
                  </div>
                  <p
                    className="text-muted-foreground mt-6 max-w-md text-lg leading-relaxed"
                    {...fieldAttr("default.faq.page-empty")}
                  >
                    {pageEmpty}
                  </p>
                </div>
              </FadeIn>
            ) : (
              <FadeIn direction="up">
                {/* Heading-order patch (as the contact rail's): the items are
                    h3 triggers, so an h2 sits between them and the h1. */}
                <h2 className="sr-only">Questions and answers</h2>
                <BambooAccordion className="max-w-3xl">
                  {items.map((item) => (
                    <BambooAccordionItem
                      key={item.id}
                      id={item.id}
                      title={item.question}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {item.answer}
                      </p>
                    </BambooAccordionItem>
                  ))}
                </BambooAccordion>
              </FadeIn>
            )}
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
