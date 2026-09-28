import type { DefaultFaqPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";

// Default's resolver + fallbacks, not pollen's: this page keeps reading the
// existing `default.faq.*` keys, and only Default's field map knows their
// `defaultValue`s — pollen's `resolveFields` would return "" for each.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { PollenGeneralLayout } from "../layout/pollen-general-layout";

/**
 * `/faq` — pollen's FAQ page on the generic base. The heading moves into the
 * `PollenGeneralLayout` band (the page's only h1); the questions sit in a
 * centered max-w-3xl column under the centered band, as on the blog post.
 * Data logic is Default's FAQ page's: heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks, and the native `<details>/<summary>`
 * accordion — keyboard + screen-reader support with zero JS. Ends on the
 * global pollen CTA.
 *
 * No `<main>` here (Default's page renders one): pollen's layout already
 * wraps every page in `<main id="main-content">`.
 */
export function PollenFaqPage({
  business,
  items,
}: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;

  return (
    <PollenGeneralLayout
      business={business}
      title={pageHeading}
      titleFieldKey="default.faq.page-heading"
    >
      <section
        {...sectionGroupAttr("faq", "page")}
        className="bg-white py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn direction="up">
            <div className="mx-auto max-w-3xl">
              {items.length === 0 ? (
                <div className="rounded-2xl bg-[#f5f2ee] px-6 py-16 text-center">
                  <p
                    className="text-lg leading-relaxed text-[#4b5563]"
                    {...fieldAttr("default.faq.page-empty")}
                  >
                    {pageEmpty}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-10 text-center text-lg leading-relaxed text-[#4b5563]">
                    Answers to common questions about {business.name}.
                  </p>
                  <div className="divide-y divide-[#e5e7eb] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
                    {items.map((item) => (
                      <FaqAccordionItem
                        key={item.id}
                        question={item.question}
                        answer={item.answer}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </FadeIn>
        </div>
      </section>
    </PollenGeneralLayout>
  );
}

// ─── Accordion item (native details/summary) ─────────────────────────────────
// Native <details>/<summary> gives keyboard + screen-reader support with zero
// JS — each item is independently expandable without a client component.

function FaqAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-[#374151] transition-colors marker:hidden hover:bg-[#f5f2ee]/60 hover:text-[#215935] focus-visible:ring-2 focus-visible:ring-[#215935] focus-visible:outline-none focus-visible:ring-inset md:px-8 md:py-6 md:text-lg [&::-webkit-details-marker]:hidden">
        <span>{question}</span>
        {/* Chevron rotates via CSS — no JS required */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#215935] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="px-6 pb-6 text-base leading-relaxed whitespace-pre-wrap text-[#4b5563] md:px-8">
        {answer}
      </div>
    </details>
  );
}
