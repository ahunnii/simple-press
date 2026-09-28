import type { DefaultFaqPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";

// Default's resolver + fallbacks, not vii's: this page keeps reading the
// existing `default.faq.*` keys, and only Default's field map knows their
// `defaultValue`s — vii's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { ViiPageBand } from "../generic/vii-page-band";
import { ViiPageEmptyState } from "../generic/vii-page-empty-state";
import { ViiPageSection } from "../generic/vii-page-section";
import { ViiAccordion, ViiAccordionItem } from "../shared/vii-accordion";
import { VII_TEXT_MEASURE } from "../shared/vii-page-edge";
import { ViiReveal } from "../shared/vii-reveal";

/**
 * `/faq` — vii's FAQ page on the generic base. The heading sits in the
 * cream `ViiPageBand` (the page's only h1, below the fixed header); the
 * questions sit on the page edge at a readable measure in vii's own
 * hairline accordion (`ViiAccordionItem`, native `<details>/<summary>`:
 * keyboard + screen-reader support with zero JS), with each question set in
 * the brand serif rather than the product page's small caps.
 *
 * Data logic is Default's FAQ page's: heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks and the "Answers to common questions
 * about <business>" line when there are items. `faq.page` is the page's one
 * group, so its `sectionGroupAttr` sits on a wrapper around band + body.
 *
 * No `<main>` here (Default's page renders one): vii's layout already wraps
 * every page in `<main id="main-content">`.
 */
export function ViiFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;

  return (
    <PageTransition>
      <div {...sectionGroupAttr("faq", "page")}>
        <ViiPageBand
          title={pageHeading}
          titleFieldKey="default.faq.page-heading"
          intro={
            items.length > 0
              ? `Answers to common questions about ${business.name}.`
              : undefined
          }
        />

        <ViiPageSection innerStyle={{ maxWidth: VII_TEXT_MEASURE + 80 }}>
          {items.length === 0 ? (
            <ViiPageEmptyState
              heading={pageEmpty}
              headingFieldKey="default.faq.page-empty"
            />
          ) : (
            <ViiReveal threshold={0.04}>
              <ViiAccordion>
                {items.map((item) => (
                  <ViiAccordionItem
                    key={item.id}
                    title={
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "clamp(18px, 1.6vw, 21px)",
                          fontWeight: 400,
                          lineHeight: 1.35,
                          letterSpacing: 0,
                          textTransform: "none",
                          textAlign: "left",
                          paddingRight: 24,
                        }}
                      >
                        {item.question}
                      </span>
                    }
                  >
                    <div
                      style={{
                        fontSize: 15,
                        whiteSpace: "pre-wrap",
                        maxWidth: VII_TEXT_MEASURE,
                      }}
                    >
                      {item.answer}
                    </div>
                  </ViiAccordionItem>
                ))}
              </ViiAccordion>
            </ViiReveal>
          )}
        </ViiPageSection>
      </div>
    </PageTransition>
  );
}
