import type { DefaultFaqPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

// Default's resolver + fallbacks, not olive's: this page keeps reading the
// existing `default.faq.*` keys, and only Default's field map knows their
// `defaultValue`s — olive's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { OlivePageBand } from "../generic/olive-page-band";
import { OlivePageSection } from "../generic/olive-page-section";
import {
  OliveAccordion,
  OliveAccordionItem,
  OliveEmptyState,
  OliveReveal,
} from "../shared";

/**
 * `/faq` — olive's FAQ page on the generic base. The heading sits in the
 * white `OlivePageBand` (the page's only h1); the questions sit on the page
 * edge at a readable measure as olive's own accordion — one `olive-card` per
 * question, `type="multiple"` so a reader can keep answers open to compare
 * them, each trigger a real button inside an `h2` (they sit directly under
 * the page h1).
 *
 * Data logic is Default's FAQ page's: heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks and the "Answers to common questions about
 * <business>" line when there are items. `faq.page` is the page's one group,
 * so its `sectionGroupAttr` sits on a wrapper around band + body.
 *
 * No `<main>` here (Default's page renders one): olive's layout already
 * wraps every page in `<main id="main-content">`. No search/filter input, so
 * nothing interactive sits inside the reveal.
 */
export function OliveFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;

  return (
    <div {...sectionGroupAttr("faq", "page")}>
      <OlivePageBand
        title={pageHeading}
        titleFieldKey="default.faq.page-heading"
        intro={
          items.length > 0
            ? `Answers to common questions about ${business.name}.`
            : undefined
        }
      />

      <OlivePageSection flush aria-label="Questions">
        {/* Readable measure, left-anchored on the page edge (B1.7) — the
            narrowing lives inside the edge container, never on it. */}
        <div style={{ maxWidth: "52rem" }}>
          {items.length === 0 ? (
            <OliveEmptyState
              headingAs="h2"
              className="w-full"
              heading={pageEmpty}
              headingFieldKey="default.faq.page-empty"
            />
          ) : (
            <OliveReveal threshold={0}>
              <OliveAccordion type="multiple">
                {items.map((item) => (
                  <OliveAccordionItem
                    key={item.id}
                    id={item.id}
                    title={item.question}
                    headingLevel={2}
                  >
                    <div style={{ whiteSpace: "pre-wrap", maxWidth: "68ch" }}>
                      {item.answer}
                    </div>
                  </OliveAccordionItem>
                ))}
              </OliveAccordion>
            </OliveReveal>
          )}
        </div>
      </OlivePageSection>
    </div>
  );
}
