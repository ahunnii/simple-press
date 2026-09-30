import { Plus } from "lucide-react";

import type { DefaultFaqPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

// Default's resolver + fallbacks, not dream's: this page keeps reading the
// existing `default.faq.*` keys, and only Default's field map is guaranteed
// to know their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { DreamOptionalEmptyState } from "../events/dream-optional-empty-state";
import { resolveDreamPageLogo } from "../events/dream-optional-page";
import { DreamPageHero } from "../shared/dream-page-hero";
import { DreamSection } from "../shared/dream-section";

/**
 * `/faq` — dream's FAQ page on the generic page base (parity PF20). The
 * heading sits in the `DreamPageHero` sky band (the page's only h1, with
 * Default's "Answers to common questions about <business>" line as its lede
 * when there are items); the questions sit on the container edge at the
 * generic page's reading measure, as a gold-hairline list — each question
 * in Italiana, a plus that turns to a cross when open, the answer in soft
 * Mulish body.
 *
 * Data logic is Default's FAQ page's: heading/empty copy with the
 * `FAQ_PAGE_*_DEFAULT` fallbacks and the native `<details>/<summary>`
 * accordion — keyboard + screen-reader support with zero JS, each item
 * independently expandable. `faq.page` is the page's one group, so its
 * `sectionGroupAttr` sits on a wrapper around band + body.
 *
 * No `<main>` here (Default's page renders one): dream's layout already
 * wraps every page in `<main id="main-content">`.
 */
export function DreamFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const f = resolveDefaultFields(business.siteContent?.customFields, [
    "default.faq.page-heading",
    "default.faq.page-empty",
  ]);
  const pageHeading =
    (f["default.faq.page-heading"] ?? "").trim() || FAQ_PAGE_HEADING_DEFAULT;
  const pageEmpty =
    (f["default.faq.page-empty"] ?? "").trim() || FAQ_PAGE_EMPTY_DEFAULT;
  const { logoUrl, logoAlt } = resolveDreamPageLogo(business);

  return (
    <div {...sectionGroupAttr("faq", "page")}>
      <DreamPageHero
        logoUrl={logoUrl}
        logoAlt={logoAlt}
        title={pageHeading}
        titleFieldKey="default.faq.page-heading"
        lede={
          items.length > 0
            ? `Answers to common questions about ${business.name}.`
            : ""
        }
      />

      <DreamSection aria-label="Questions" reveal={items.length > 0}>
        {items.length === 0 ? (
          <DreamOptionalEmptyState
            heading={pageEmpty}
            headingFieldKey="default.faq.page-empty"
          />
        ) : (
          // Reading measure left-anchored on the container edge (B1.7), the
          // same edge and width family as the generic page's article.
          <div className="max-w-[860px] border-t border-[var(--dream-line)]">
            {items.map((item) => (
              <details
                key={item.id}
                className="group border-b border-[var(--dream-line)]"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 marker:hidden sm:py-7 [&::-webkit-details-marker]:hidden">
                  <span className="[font-family:var(--font-dream-display)] text-[clamp(22px,2.2vw,27px)] leading-[1.25] text-[var(--dream-ink)] transition-colors duration-200 group-hover:text-[var(--dream-rose)] motion-reduce:transition-none">
                    {item.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--dream-line)] bg-[var(--dream-white)] text-[var(--dream-ink)] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                  >
                    <Plus strokeWidth={1.5} className="h-4 w-4" />
                  </span>
                </summary>
                <div className="max-w-[66ch] pr-12 pb-7 text-[17px] leading-[1.7] whitespace-pre-wrap text-[var(--dream-soft)]">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        )}
      </DreamSection>
    </div>
  );
}
