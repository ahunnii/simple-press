"use client";

/**
 * vii-ledger — Minimal, type-led service page
 *
 * Designed for services that often have NO photography and NO testimonials.
 * Looks intentional with zero images; supports optional media when present.
 *
 * Layout:
 * 1. Adaptive hero (LedgerHero) — three branches by precedence:
 *    - Video set → full-width media panel (ServiceHeroVideo) + navy scrim + bottom-left name overlay
 *    - Image set (no video) → full-bleed next/image fill + same scrim + name overlay
 *    - Neither (DEFAULT) → light cream typographic hero: copper-deep overline, thin copper rule,
 *      service name in large navy Playfair-italic <h1>, optional description in ink-soft
 * 2. LedgerIntro — centred overline + serif heading + copper-italic accent + richtext body
 *    via TiptapRenderer + optional image/video via ServiceSectionMedia.
 *    Returns null when heading/accent/body are all empty.
 * 3. LedgerList — two-column treatment table (gridTemplateColumns: "1fr 1.4fr"),
 *    tan hairline rules, duration/compare-at/price chips, price tiers, add-ons,
 *    inline underlined "Book →" ServiceBookingDialog.
 * 4. Closing CTA — ViiContactCtaSection with vii-ledger.cta-* fields.
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import {
  parseTemplateIframeValue,
  parseTemplateRichtext,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";

import { ViiContactCtaSection } from "../../homepage/vii-contact-cta-section";
import { useViiReveal } from "../../hooks/use-vii-reveal";
import {
  LedgerHero,
  LedgerIntro,
  LedgerListStyles,
  LedgerNotes,
  LedgerProductRail,
  TreatmentListRow,
} from "./_ledger-shared";
import { resolveLedgerFields } from "./fields";

// ─── LedgerList (ledger-specific, uses shared row/styles) ────────────────────

function LedgerList({
  items,
  embedsEnabled,
  listHeading,
  listIntro,
}: {
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  listHeading: string;
  listIntro: string;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.08);
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="ledger-list-heading"
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <LedgerListStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {(listHeading || listIntro) && (
          <div
            ref={headRef}
            className={cn(
              "vii-reveal vii-ledger-list-row",
              headVisible && "is-visible",
            )}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: "clamp(24px, 4vw, 56px)",
              marginBottom: "clamp(32px, 5vw, 56px)",
              paddingBottom: "clamp(24px, 3vw, 40px)",
              borderBottom: "1px solid var(--vii-tan)",
              alignItems: "end",
            }}
          >
            <h2
              id="ledger-list-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(28px, 4vw, 52px)",
                lineHeight: 1.08,
                color: "var(--vii-navy)",
                margin: 0,
                textWrap: "balance",
              }}
            >
              {listHeading || (
                <>
                  Our{" "}
                  <em
                    style={{ fontStyle: "italic", color: "var(--vii-copper)" }}
                  >
                    treatments
                  </em>
                </>
              )}
            </h2>

            {listIntro && (
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "clamp(14px, 1.3vw, 15px)",
                  lineHeight: 1.8,
                  color: "var(--vii-ink-soft)",
                  margin: 0,
                }}
              >
                {listIntro}
              </p>
            )}
          </div>
        )}

        <div
          ref={rowsRef}
          className={cn("vii-reveal-group", rowsVisible && "is-visible")}
        >
          {items.map((item, i) => (
            <TreatmentListRow
              key={item.id}
              item={item}
              embedsEnabled={embedsEnabled}
              isLast={i === items.length - 1}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ViiLedgerServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const cf = service.customFields as Record<string, unknown> | null | undefined;

  const f = resolveLedgerFields(service.customFields, [
    "vii-ledger.hero-video",
    "vii-ledger.hero-image",
    "vii-ledger.hero-overline",
    "vii-ledger.intro-overline",
    "vii-ledger.intro-heading",
    "vii-ledger.intro-heading-accent",
    "vii-ledger.intro-image",
    "vii-ledger.intro-video",
    "vii-ledger.list-heading",
    "vii-ledger.list-intro",
    "vii-ledger.notes-heading",
    "vii-ledger.notes-gratuity",
    "vii-ledger.notes-cancellation",
    "vii-ledger.rail-overline",
    "vii-ledger.rail-heading",
    "vii-ledger.rail-collection",
    "vii-ledger.rail-featured-only",
    "vii-ledger.rail-cta-text",
    "vii-ledger.rail-cta-url",
    "vii-ledger.cta-image",
    "vii-ledger.cta-heading",
    "vii-ledger.cta-subheading",
    "vii-ledger.cta-body",
    "vii-ledger.cta-button-label",
    "vii-ledger.cta-button-url",
    "vii-ledger.cta-embed",
    "vii-ledger.cta-embed-reveal",
    "vii-ledger.cta-show-phone",
    "vii-ledger.cta-show-email",
  ]);

  const introBodyJson = parseTemplateRichtext(cf?.["vii-ledger.intro-body"]);

  const ctaEmbed = parseTemplateIframeValue(f["vii-ledger.cta-embed"]);
  const ctaEmbedReveal = f["vii-ledger.cta-embed-reveal"] === "true";

  const publishedItems = items.filter((it) => it.published !== false);

  return (
    <PageTransition>
      <LedgerHero
        heroVideo={f["vii-ledger.hero-video"] ?? undefined}
        heroImage={f["vii-ledger.hero-image"] ?? undefined}
        serviceName={service.name}
        serviceDescription={service.description}
        overline={f["vii-ledger.hero-overline"] ?? ""}
      />

      <LedgerIntro
        overline={f["vii-ledger.intro-overline"] ?? ""}
        heading={f["vii-ledger.intro-heading"] ?? ""}
        headingAccent={f["vii-ledger.intro-heading-accent"] ?? ""}
        bodyJson={introBodyJson}
        introImageSrc={f["vii-ledger.intro-image"] ?? ""}
        introVideoSrc={f["vii-ledger.intro-video"] ?? ""}
      />

      {publishedItems.length > 0 && (
        <LedgerList
          items={publishedItems}
          embedsEnabled={embedsEnabled}
          listHeading={f["vii-ledger.list-heading"] ?? ""}
          listIntro={f["vii-ledger.list-intro"] ?? ""}
        />
      )}

      <LedgerNotes
        heading={f["vii-ledger.notes-heading"] ?? ""}
        gratuity={f["vii-ledger.notes-gratuity"] ?? ""}
        cancellation={f["vii-ledger.notes-cancellation"] ?? ""}
      />

      <LedgerProductRail
        overline={f["vii-ledger.rail-overline"] ?? ""}
        heading={f["vii-ledger.rail-heading"] ?? ""}
        ctaText={f["vii-ledger.rail-cta-text"] ?? ""}
        ctaHref={f["vii-ledger.rail-cta-url"] ?? "/shop"}
        collectionId={f["vii-ledger.rail-collection"] ?? ""}
        featuredOnly={f["vii-ledger.rail-featured-only"] === "true"}
      />

      <ViiContactCtaSection
        contactImage={f["vii-ledger.cta-image"] ?? undefined}
        heading={f["vii-ledger.cta-heading"] ?? ""}
        subheading={f["vii-ledger.cta-subheading"] ?? ""}
        body={f["vii-ledger.cta-body"] ?? ""}
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii-ledger.cta-button-label"] ?? ""}
        buttonHref={f["vii-ledger.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={embedsEnabled}
        embedReveal={ctaEmbedReveal}
        showPhone={f["vii-ledger.cta-show-phone"] !== "false"}
        showEmail={f["vii-ledger.cta-show-email"] !== "false"}
      />
    </PageTransition>
  );
}
