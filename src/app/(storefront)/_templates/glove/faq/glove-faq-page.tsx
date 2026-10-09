import type { DefaultFaqPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

// Default's resolver + fallbacks, not glove's: this page keeps reading the
// existing `default.faq.*` keys; only Default's field map knows their defaults.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { GloveEmptyState } from "../generic/glove-empty-state";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import { GloveAccordion, GloveSection } from "../shared";

/** Max width (px) of the FAQ column. */
const FAQ_BODY_WIDTH = 860;

/**
 * `/faq` — glove's FAQ on the generic base: the heading lives in the banner
 * band (the page's only h1) and the questions sit in a centered column as a
 * hairline `GloveAccordion` (native `<details>`, first row open, works with no
 * JS). The one `faq.page` group owns the whole page, so its hotspot is the
 * wrapping root.
 */
export function GloveFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const heading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const empty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;

  return (
    <GloveGeneralLayout
      bandVariant="banner"
      title={heading}
      titleFieldKey="default.faq.page-heading"
      breadcrumb={[{ label: "Home", href: "/" }, { label: heading }]}
      rootAttrs={sectionGroupAttr("faq", "page")}
    >
      <GloveSection tone="paper" aria-label={heading} revealThreshold={0}>
        <div className="mx-auto" style={{ maxWidth: FAQ_BODY_WIDTH }}>
          {items.length === 0 ? (
            <GloveEmptyState
              body={empty}
              bodyFieldKey="default.faq.page-empty"
            />
          ) : (
            <GloveAccordion
              items={items.map((item) => ({
                id: item.id,
                question: item.question,
                answer: (
                  <p className="glove-body whitespace-pre-wrap">
                    {item.answer}
                  </p>
                ),
              }))}
            />
          )}
        </div>
      </GloveSection>
    </GloveGeneralLayout>
  );
}
