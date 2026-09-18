import { Phone } from "lucide-react";

import type { DefaultFaqPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";

import { resolveFields } from "..";
import { UmscAccordion, UmscAccordionItem } from "../shared/umsc-accordion";
import { UmscButton } from "../shared/umsc-button";
import { UmscHeading } from "../shared/umsc-heading";
import { UmscLede } from "../shared/umsc-lede";
import { UmscReveal, UmscRevealGroup } from "../shared/umsc-reveal";
import { UmscSection } from "../shared/umsc-section";

/**
 * UmscFaqPage — FaqPage has no playbook entry (built from
 * `_templates/default/faq/default-faq-page.tsx`'s data shape, see
 * `faq/index.tsx`). design.md "Per-page section concepts → FAQ": page hero
 * (h1 + lede + phone + contact link) → accordion of `faq.list` DB items in a
 * 1fr/2fr split with a "Good to know" h2 left on desktop → hideable closing
 * CTA band.
 */
export function UmscFaqPage({ business, items }: DefaultFaqPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "umsc.faq.hero-heading",
    "umsc.faq.hero-lede",
    "umsc.faq.hero-contact-label",
    "umsc.faq.hero-contact-url",
    "umsc.faq.list-heading",
    "umsc.faq.empty-state-text",
    "umsc.faq.empty-state-link-label",
    "umsc.faq.empty-state-link-url",
    "umsc.faq.cta-heading",
    "umsc.faq.cta-body",
    "umsc.faq.cta-button-label",
    "umsc.faq.cta-button-url",
    "umsc.global.customer-service-phone",
  ]);

  // Business-record-first, field-as-override — same source and precedence
  // rule as `layout/umsc-footer.tsx`'s phone line.
  const phone =
    (f["umsc.global.customer-service-phone"] ?? "").trim() ||
    (business?.phoneNumber ?? "");

  const hasItems = items.length > 0;

  return (
    <>
      {/* ── Hero — composed from UmscHeading/UmscLede rather than
          UmscPageHero: this band also needs the phone + contact line under
          the lede, which UmscPageHero's fixed heading/lede/image shape has
          no slot for. Same visual language (black, gold hairline bottom,
          uppercase Marcellus h1). ── */}
      <section
        aria-label="Page introduction"
        {...sectionGroupAttr("faq", "hero")}
        className="umsc-black-surface relative border-b-2 border-[var(--umsc-gold)] bg-[var(--umsc-black)]"
      >
        <div
          className="mx-auto px-6 py-16 sm:px-8 lg:py-24"
          style={{ maxWidth: "var(--umsc-container)" }}
        >
          <UmscHeading
            as="h1"
            fieldKey="umsc.faq.hero-heading"
            className="text-[var(--umsc-cream-on-black)]"
          >
            {f["umsc.faq.hero-heading"] ?? ""}
          </UmscHeading>
          {f["umsc.faq.hero-lede"] && (
            <UmscLede onBlack fieldKey="umsc.faq.hero-lede" className="mt-5">
              {f["umsc.faq.hero-lede"] ?? ""}
            </UmscLede>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="umsc-sans flex items-center gap-2 text-[14px] text-[var(--umsc-cream-on-black)] no-underline hover:opacity-80"
              >
                <Phone
                  className="size-4 shrink-0"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {phone}
              </a>
            )}
            {f["umsc.faq.hero-contact-url"] && (
              <UmscButton
                as="link"
                href={f["umsc.faq.hero-contact-url"] ?? "/contact"}
                variant="link"
                fieldKey="umsc.faq.hero-contact-label"
                className="text-[var(--umsc-gold-soft)]"
              >
                {f["umsc.faq.hero-contact-label"] ?? ""}
              </UmscButton>
            )}
          </div>
        </div>
      </section>

      {/* ── Questions ─────────────────────────────────────────────────── */}
      <UmscSection
        tone="paper"
        aria-label="Frequently asked questions"
        sectionAttrs={sectionGroupAttr("faq", "accordion")}
      >
        <UmscReveal>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <UmscHeading as="h2" fieldKey="umsc.faq.list-heading">
              {f["umsc.faq.list-heading"] ?? ""}
            </UmscHeading>

            {hasItems ? (
              <UmscRevealGroup>
                <UmscAccordion>
                  {items.map((item, i) => (
                    <div
                      key={item.id}
                      className="umsc-reveal-item"
                      style={{ "--i": Math.min(i, 6) } as React.CSSProperties}
                    >
                      <UmscAccordionItem title={item.question}>
                        <p className="m-0 whitespace-pre-wrap">{item.answer}</p>
                      </UmscAccordionItem>
                    </div>
                  ))}
                </UmscAccordion>
              </UmscRevealGroup>
            ) : (
              // Designed empty state — a line + a link, never blank.
              <div className="border-t border-[var(--umsc-hairline)] pt-8">
                <p
                  {...fieldAttr("umsc.faq.empty-state-text")}
                  className="umsc-sans max-w-[52ch] text-[16px] leading-[1.7] text-[var(--umsc-muted)]"
                >
                  {f["umsc.faq.empty-state-text"] ?? ""}
                </p>
                {f["umsc.faq.empty-state-link-url"] && (
                  <UmscButton
                    as="link"
                    href={f["umsc.faq.empty-state-link-url"] ?? "/contact"}
                    variant="link"
                    fieldKey="umsc.faq.empty-state-link-label"
                    className="mt-4"
                  >
                    {f["umsc.faq.empty-state-link-label"] ?? ""}
                  </UmscButton>
                )}
              </div>
            )}
          </div>
        </UmscReveal>
      </UmscSection>

      {/* ── Closing CTA ───────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "umsc", "faq.cta") && (
        <UmscSection
          tone="cream"
          aria-label="Still have a question?"
          sectionAttrs={sectionGroupAttr("faq", "cta")}
        >
          <UmscReveal>
            <div className="flex flex-col items-center gap-5 text-center">
              <UmscHeading as="h2" fieldKey="umsc.faq.cta-heading">
                {f["umsc.faq.cta-heading"] ?? ""}
              </UmscHeading>
              {f["umsc.faq.cta-body"] && (
                <UmscLede
                  fieldKey="umsc.faq.cta-body"
                  className="mx-auto text-center"
                >
                  {f["umsc.faq.cta-body"] ?? ""}
                </UmscLede>
              )}
              <UmscButton
                as="link"
                href={f["umsc.faq.cta-button-url"] ?? "/contact"}
                variant="gold"
                fieldKey="umsc.faq.cta-button-label"
              >
                {f["umsc.faq.cta-button-label"] ?? ""}
              </UmscButton>
            </div>
          </UmscReveal>
        </UmscSection>
      )}
    </>
  );
}
