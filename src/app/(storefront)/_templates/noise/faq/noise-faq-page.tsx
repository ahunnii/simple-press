import type { DefaultFaqPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

// Default's resolver + fallbacks, not noise's: this page keeps reading the
// existing `default.faq.*` keys, and only Default's field map knows their
// `defaultValue`s — noise's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { NoiseEmptyState } from "../generic/noise-empty-state";
import { NoisePageBand, NoisePageBody } from "../generic/noise-page-shell";
import { nonBlank } from "../shared/noise-non-blank";
import { NoiseFaqAccordion } from "./noise-faq-accordion";

/**
 * `/faq` — noise's FAQ page on the generic page base (PF12). The heading
 * sits in the centred title band (the page's only h1) under the same "FAQ"
 * mono overline the contact page's FAQ block uses; the questions sit in the
 * centred `max-w-3xl` column as the contact page's ruled accordion, each
 * trigger a real button inside an `h2`.
 *
 * Data logic is Default's FAQ page's: heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks and the "Answers to common questions about
 * <business>" line when there are items. `faq.page` is the page's one group,
 * so its `sectionGroupAttr` sits on a wrapper around band + body.
 *
 * No `<main>` here (Default's page renders one): noise's layout already
 * wraps every page in `<main id="main-content">`.
 */
export function NoiseFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    nonBlank(f["default.faq.page-heading"]) ?? FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    nonBlank(f["default.faq.page-empty"]) ?? FAQ_PAGE_EMPTY_DEFAULT;

  return (
    <PageTransition>
      <div {...sectionGroupAttr("faq", "page")}>
        <NoisePageBand
          overline="FAQ"
          title={pageHeading}
          titleFieldKey="default.faq.page-heading"
          intro={
            items.length > 0
              ? `Answers to common questions about ${business.name}.`
              : null
          }
        />

        <NoisePageBody width="measure" aria-label="Questions">
          {items.length === 0 ? (
            <NoiseEmptyState
              heading={pageEmpty}
              headingFieldKey="default.faq.page-empty"
            />
          ) : (
            <FadeIn>
              <NoiseFaqAccordion
                items={items.map(({ id, question, answer }) => ({
                  id,
                  question,
                  answer,
                }))}
              />
            </FadeIn>
          )}
        </NoisePageBody>
      </div>
    </PageTransition>
  );
}
