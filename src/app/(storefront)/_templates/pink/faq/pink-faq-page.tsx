import type { DefaultFaqPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

// Default's resolver + fallbacks, not pink's: this page reads the existing
// `default.faq.*` keys (re-exported from `./index` so pink's editor lists
// them), and Default's field map is the one that always knows their
// `defaultValue`s — the pollen FAQ page does the same.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { PinkPageHeader } from "../shared/pink-page-header";

/**
 * `/faq` — pink's FAQ page on the generic-page base: the flat
 * `PinkPageHeader` band (breadcrumb → H1 → intro) over the generic body's
 * shell (`px-5 md:px-10` band, unpadded `max-w-[1400px]` wrapper, `74ch`
 * measure), so it shares the title band's left edge like every other
 * interior page.
 *
 * Data logic is Default's FAQ page's: the heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks, and every published `FaqItem` as a
 * disclosure row. The rows are native `<details>/<summary>` (keyboard +
 * screen-reader support, no client JS, find-in-page opens a match) drawn in
 * `PinkAccordion`'s language — 17px display question, rose `+`/`−`, 1px
 * `--pink-line` rules. Not `PinkAccordion` itself: it wraps each trigger in an
 * `h3`, which would skip a level straight under this page's H1.
 *
 * No `<main>` here: `PinkLayout` already wraps every page in
 * `<main id="main-content">`. One `faq.page` section covers the header and the
 * list, since both of its fields render here.
 */
export function PinkFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;
  const hasItems = items.length > 0;

  return (
    <div {...sectionGroupAttr("faq", "page")}>
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: pageHeading }]}
        heading={pageHeading}
        headingFieldKey="default.faq.page-heading"
        // Default's structural line, shown only when there is something to
        // answer (as on Default).
        intro={
          hasItems
            ? `Answers to common questions about ${business.name}.`
            : undefined
        }
      />

      <section className="px-5 py-11 md:px-10 md:py-[44px]">
        <div className="mx-auto max-w-[1400px] pb-16 md:pb-[88px]">
          {hasItems ? (
            <div
              className="max-w-[74ch]"
              style={{ borderTop: "1px solid var(--pink-line)" }}
            >
              {items.map((item) => (
                <PinkFaqItem
                  key={item.id}
                  question={item.question}
                  answer={item.answer}
                />
              ))}
            </div>
          ) : (
            <p
              className="max-w-[46ch] text-[17px] leading-[1.7]"
              style={{ color: "var(--pink-body)" }}
              {...fieldAttr("default.faq.page-empty")}
            >
              {pageEmpty}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Disclosure row (native details/summary) ─────────────────────────────────

function PinkFaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details
      className="group"
      style={{ borderBottom: "1px solid var(--pink-line)" }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
        <span
          className="pink-display"
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "var(--pink-ink)",
          }}
        >
          {question}
        </span>
        <span
          aria-hidden="true"
          className="pink-display shrink-0"
          style={{
            fontSize: "20px",
            fontWeight: 400,
            color: "var(--pink-rose)",
          }}
        >
          <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </span>
      </summary>
      <div
        className="pb-5 text-[15px] leading-[1.7] whitespace-pre-wrap"
        style={{ color: "var(--pink-body)" }}
      >
        {answer}
      </div>
    </details>
  );
}
