"use client";

/**
 * vii-collection — Sectioned, type-led service page
 *
 * A sibling of vii-ledger that groups a service's items into owner-defined
 * sub-sections (e.g. a "Skin Care" service split into Facials, Needling,
 * Dermaplaning). Each section has an optional description and image/video
 * header. Items are assigned to sections via ServiceItem.category (which holds
 * the section row's stable _id from parseTemplateListRows).
 *
 * Layout:
 * 1. LedgerHero       — identical to vii-ledger (shared)
 * 2. LedgerIntro      — identical to vii-ledger (shared)
 * 3. Sectioned list   — one block per defined section; unassigned items trail
 *                       in a "More services" block. Falls back to a flat list
 *                       when no sections are configured.
 * 4. LedgerNotes      — identical to vii-ledger (shared)
 * 5. LedgerProductRail — identical to vii-ledger (shared)
 * 6. ViiContactCtaSection — identical to vii-ledger (shared)
 */
import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";
import {
  parseTemplateIframeValue,
  parseTemplateListRows,
  parseTemplateRichtext,
} from "~/lib/template-fields";
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
import { resolveCollectionFields } from "./fields";

/** Coerce an unknown template-list-row value to a trimmed string. */
const asStr = (v: unknown): string => (typeof v === "string" ? v : "");

// ─── CollectionListHeader ─────────────────────────────────────────────────────

/**
 * The heading row shown at the top of the whole list (mirrors LedgerList's
 * header row). Rendered once regardless of whether sections are active.
 */
function CollectionListHeader({
  listHeading,
  listIntro,
}: {
  listHeading: string;
  listIntro: string;
}) {
  const { ref, visible } = useViiReveal(0.08);
  return (
    <div
      ref={ref}
      className={`vii-reveal vii-ledger-list-row${visible ? " is-visible" : ""}`}
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
        id="collection-list-heading"
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          fontSize: "clamp(28px, 4vw, 52px)",
          lineHeight: 1.08,
          color: "var(--vii-navy)",
          margin: 0,
        }}
      >
        {listHeading || (
          <>
            Our{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
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
  );
}

// ─── SectionBlock ─────────────────────────────────────────────────────────────

/**
 * One named section (e.g. "Facials") with optional description + media header,
 * followed by its assigned TreatmentListRows.
 */
function SectionBlock({
  label,
  description,
  imageSrc,
  videoSrc,
  items,
  embedsEnabled,
  indexOffset,
  isLastSection,
}: {
  label: string;
  description: string;
  imageSrc: string;
  videoSrc: string;
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  indexOffset: number;
  isLastSection: boolean;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.08);
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.08);

  const hasMedia = videoSrc.trim().length > 0 || imageSrc.trim().length > 0;

  return (
    <div
      style={{
        marginBottom: isLastSection ? 0 : "clamp(48px, 7vw, 80px)",
      }}
    >
      {/* Section header — only render when there is something to show */}
      {(label || description || hasMedia) && (
        <div
          ref={headRef}
          className={`vii-reveal${headVisible ? " is-visible" : ""}`}
          style={{
            marginBottom: "clamp(20px, 3vw, 32px)",
            paddingBottom: "clamp(16px, 2vw, 24px)",
            borderBottom: "1px solid var(--vii-tan)",
          }}
        >
          {label && (
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontStyle: "italic",
                fontSize: "clamp(22px, 3vw, 36px)",
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: "0 0 8px",
              }}
            >
              {label}
            </h3>
          )}

          {description && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(13px, 1.2vw, 15px)",
                lineHeight: 1.75,
                color: "var(--vii-ink-soft)",
                margin: hasMedia ? "0 0 clamp(20px, 3vw, 28px)" : 0,
                maxWidth: 560,
              }}
            >
              {description}
            </p>
          )}

          {hasMedia && (
            <ServiceSectionMedia
              imageSrc={imageSrc || undefined}
              videoSrc={videoSrc || undefined}
              alt={label ? `${label} section` : ""}
              style={{
                maxWidth: 680,
                aspectRatio: "16/9",
              }}
            />
          )}
        </div>
      )}

      {/* Item rows */}
      {items.length > 0 && (
        <div
          ref={rowsRef}
          className={`vii-reveal-group${rowsVisible ? " is-visible" : ""}`}
        >
          {items.map((item, i) => (
            <TreatmentListRow
              key={item.id}
              item={item}
              embedsEnabled={embedsEnabled}
              isLast={i === items.length - 1}
              index={indexOffset + i}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CollectionList ───────────────────────────────────────────────────────────

function CollectionList({
  items,
  embedsEnabled,
  listHeading,
  listIntro,
  sections,
}: {
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  listHeading: string;
  listIntro: string;
  sections: ReturnType<typeof parseTemplateListRows>;
}) {
  const { ref: fallbackRef, visible: fallbackVisible } = useViiReveal(0.08);

  // Build a set of known section _ids so we can detect unassigned items
  const sectionIds = new Set(sections.map((s) => String(s._id ?? "")));

  // Items whose category matches a known section _id
  const itemsBySection = (sectionId: string) =>
    items.filter((it) => (it.category ?? "") === sectionId);

  // Items with no category, an empty category, or a category that doesn't
  // match any currently-defined section (orphaned after a section was deleted)
  const unassignedItems = items.filter((it) => {
    const cat = (it.category ?? "").trim();
    return cat === "" || !sectionIds.has(cat);
  });

  return (
    <section
      aria-labelledby="collection-list-heading"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
      }}
    >
      <LedgerListStyles />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <CollectionListHeader listHeading={listHeading} listIntro={listIntro} />

        {sections.length === 0 ? (
          /* ── Fallback: flat list (no sections configured yet) ── */
          <div
            ref={fallbackRef}
            className={`vii-reveal-group${fallbackVisible ? " is-visible" : ""}`}
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
        ) : (
          /* ── Sectioned layout ── */
          <>
            {sections.map((section, si) => {
              const sectionId = String(section._id ?? "");
              const sectionLabel = asStr(section.label).trim();
              const sectionDescription = asStr(section.description).trim();
              const sectionImage = asStr(section.image).trim();
              const sectionVideo = asStr(section.video).trim();

              // Skip rendering a section that has neither a label nor items
              // (i.e. a completely blank slot) — but keep it if it has a label
              // so the owner can see it's registered while they add items.
              const sectionItems = itemsBySection(sectionId);
              if (!sectionLabel && sectionItems.length === 0) return null;

              // Compute offset for the staggered reveal index
              const precedingSectionItems = sections
                .slice(0, si)
                .flatMap((s) => itemsBySection(String(s._id ?? "")));

              return (
                <SectionBlock
                  key={sectionId || si}
                  label={sectionLabel}
                  description={sectionDescription}
                  imageSrc={sectionImage}
                  videoSrc={sectionVideo}
                  items={sectionItems}
                  embedsEnabled={embedsEnabled}
                  indexOffset={precedingSectionItems.length}
                  isLastSection={si === sections.length - 1 && unassignedItems.length === 0}
                />
              );
            })}

            {/* Trailing block for unassigned / orphaned items */}
            {unassignedItems.length > 0 && (
              <SectionBlock
                label=""
                description=""
                imageSrc=""
                videoSrc=""
                items={unassignedItems}
                embedsEnabled={embedsEnabled}
                indexOffset={
                  sections.flatMap((s) =>
                    itemsBySection(String(s._id ?? "")),
                  ).length
                }
                isLastSection
              />
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ViiCollectionServicePage({
  business,
  service,
  items,
  embedsEnabled,
}: ServiceTemplateProps) {
  const cf = service.customFields as Record<string, unknown> | null | undefined;

  const f = resolveCollectionFields(service.customFields, [
    "vii-collection.hero-video",
    "vii-collection.hero-image",
    "vii-collection.hero-overline",
    "vii-collection.intro-overline",
    "vii-collection.intro-heading",
    "vii-collection.intro-heading-accent",
    "vii-collection.intro-image",
    "vii-collection.intro-video",
    "vii-collection.list-heading",
    "vii-collection.list-intro",
    "vii-collection.notes-heading",
    "vii-collection.notes-gratuity",
    "vii-collection.notes-cancellation",
    "vii-collection.rail-overline",
    "vii-collection.rail-heading",
    "vii-collection.rail-collection",
    "vii-collection.rail-featured-only",
    "vii-collection.rail-cta-text",
    "vii-collection.rail-cta-url",
    "vii-collection.cta-image",
    "vii-collection.cta-heading",
    "vii-collection.cta-subheading",
    "vii-collection.cta-body",
    "vii-collection.cta-button-label",
    "vii-collection.cta-button-url",
    "vii-collection.cta-embed",
    "vii-collection.cta-embed-reveal",
  ]);

  const introBodyJson = parseTemplateRichtext(cf?.["vii-collection.intro-body"]);

  const ctaEmbed = parseTemplateIframeValue(f["vii-collection.cta-embed"]);
  const ctaEmbedReveal = f["vii-collection.cta-embed-reveal"] === "true";

  const publishedItems = items.filter((it) => it.published !== false);

  // Parse section definitions from the list field. Each row has a stable _id.
  const sections = parseTemplateListRows(cf?.["vii-collection.sections"]);

  return (
    <PageTransition>
      <LedgerHero
        heroVideo={f["vii-collection.hero-video"] ?? undefined}
        heroImage={f["vii-collection.hero-image"] ?? undefined}
        serviceName={service.name}
        serviceDescription={service.description}
        overline={f["vii-collection.hero-overline"] ?? ""}
      />

      <LedgerIntro
        overline={f["vii-collection.intro-overline"] ?? ""}
        heading={f["vii-collection.intro-heading"] ?? ""}
        headingAccent={f["vii-collection.intro-heading-accent"] ?? ""}
        bodyJson={introBodyJson}
        introImageSrc={f["vii-collection.intro-image"] ?? ""}
        introVideoSrc={f["vii-collection.intro-video"] ?? ""}
      />

      {publishedItems.length > 0 && (
        <CollectionList
          items={publishedItems}
          embedsEnabled={embedsEnabled}
          listHeading={f["vii-collection.list-heading"] ?? ""}
          listIntro={f["vii-collection.list-intro"] ?? ""}
          sections={sections}
        />
      )}

      <LedgerNotes
        heading={f["vii-collection.notes-heading"] ?? ""}
        gratuity={f["vii-collection.notes-gratuity"] ?? ""}
        cancellation={f["vii-collection.notes-cancellation"] ?? ""}
      />

      <LedgerProductRail
        overline={f["vii-collection.rail-overline"] ?? ""}
        heading={f["vii-collection.rail-heading"] ?? ""}
        ctaText={f["vii-collection.rail-cta-text"] ?? ""}
        ctaHref={f["vii-collection.rail-cta-url"] ?? "/shop"}
        collectionId={f["vii-collection.rail-collection"] ?? ""}
        featuredOnly={f["vii-collection.rail-featured-only"] === "true"}
      />

      <ViiContactCtaSection
        contactImage={f["vii-collection.cta-image"] ?? undefined}
        heading={f["vii-collection.cta-heading"] ?? ""}
        subheading={f["vii-collection.cta-subheading"] ?? ""}
        body={f["vii-collection.cta-body"] ?? ""}
        phone={business.phoneNumber ?? ""}
        email={business.supportEmail ?? ""}
        buttonLabel={f["vii-collection.cta-button-label"] ?? ""}
        buttonHref={f["vii-collection.cta-button-url"] ?? ""}
        embed={ctaEmbed}
        embedsEnabled={embedsEnabled}
        embedReveal={ctaEmbedReveal}
      />
    </PageTransition>
  );
}
