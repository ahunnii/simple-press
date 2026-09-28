import { ChevronDown } from "lucide-react";

import type { DefaultFaqPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn, PageTransition } from "~/components/page-animations";

// Default's resolver + fallbacks: this page keeps reading the existing
// `default.faq.*` keys, and Default's field module owns their defaults.
import { resolveFields as resolveDefaultFields } from "../../default";
import {
  FAQ_PAGE_EMPTY_DEFAULT,
  FAQ_PAGE_HEADING_DEFAULT,
} from "../../default/faq";
import { HappyBambooPageShelf } from "../shared/happy-bamboo-page-shelf";

/**
 * `/faq` — happy-bamboo's FAQ page on the shared page shelf. The heading is
 * the shelf's h1; the questions sit in a left-aligned `max-w-3xl` column on
 * the shelf's container edge. Data logic is Default's FAQ page's:
 * heading/empty copy with the `FAQ_PAGE_*_DEFAULT` fallbacks and the native
 * `<details>/<summary>` accordion — keyboard + screen-reader support with
 * zero JS. Ends at content.
 *
 * No `<main>` here (Default's page renders one): happy-bamboo's layout
 * already wraps every page in `<main>`.
 */
export function HappyBambooFaqPage({
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
    <PageTransition>
      {/* Default declares a single `faq.page` group (heading + empty copy);
          its hotspot sits on the body so it isn't duplicated — the h1 still
          live-patches through its `data-sp-field`. */}
      <HappyBambooPageShelf
        title={pageHeading}
        titleFieldKey="default.faq.page-heading"
        subtitle={
          items.length > 0
            ? `Answers to common questions about ${business.name}.`
            : undefined
        }
      />

      <section className="py-16 md:py-24" {...sectionGroupAttr("faq", "page")}>
        <div className="container mx-auto px-4">
          <FadeIn className="max-w-3xl">
            {items.length === 0 ? (
              <p
                className="text-muted-foreground text-lg leading-relaxed"
                {...fieldAttr("default.faq.page-empty")}
              >
                {pageEmpty}
              </p>
            ) : (
              <div className="border-border border-t">
                {items.map((item) => (
                  <FaqAccordionItem
                    key={item.id}
                    question={item.question}
                    answer={item.answer}
                  />
                ))}
              </div>
            )}
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}

// ─── Accordion item (native details/summary) ─────────────────────────────────
// Native <details>/<summary> gives keyboard (Enter/Space) + screen-reader
// support with zero JS — each item expands independently. Styled after the
// shadcn accordion the contact page's FAQ uses: hairline rows, medium-weight
// question, rotating chevron.

function FaqAccordionItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <details className="group border-border border-b">
      <summary className="hover:text-primary focus-visible:ring-primary flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm py-5 text-left text-base font-medium transition-colors marker:hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:text-lg [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 break-words">{question}</span>
        <ChevronDown
          className="text-muted-foreground mt-0.5 h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <div className="text-muted-foreground pb-5 leading-relaxed break-words whitespace-pre-wrap">
        {answer}
      </div>
    </details>
  );
}
