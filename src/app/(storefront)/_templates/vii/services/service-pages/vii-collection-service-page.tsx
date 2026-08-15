"use client";

/**
 * vii-collection — Sectioned, type-led service page
 *
 * A sibling of vii-ledger that groups a service's items into owner-defined
 * sub-sections (e.g. a "Skin Care" service split into Facials, Needling,
 * Dermaplaning).
 *
 * Layout:
 * 1. LedgerHero          — identical to vii-ledger (shared)
 * 2. LedgerIntro         — identical to vii-ledger (shared)
 * 3. Sectioned list      — Full-bleed sibling "rooms":
 *      • Light room A (paper): header + optional signature spotlight +
 *        non-premium chapters BEFORE the premium section.
 *      • Slate room: the premium section (full-bleed, slate bg).
 *      • Light room B (paper): non-premium chapters AFTER the premium
 *        section + orphan/"More" chapter.
 *      No-premium case → one paper room with header + all chapters + orphan.
 *      Falls back to a flat list when no sections configured.
 * 4. LedgerNotes         — identical to vii-ledger (shared)
 * 5. LedgerProductRail   — identical to vii-ledger (shared)
 * 6. ViiContactCtaSection — identical to vii-ledger (shared)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { ServicePriceTier } from "~/lib/validators/services";
import {
  parseTemplateIframeValue,
  parseTemplateListRows,
  parseTemplateRichtext,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { parseServicePriceTiers } from "~/lib/validators/services";
import { PageTransition } from "~/components/page-animations";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { ServiceSectionMedia } from "~/app/(storefront)/_templates/_service-pages/_shared/service-section-media";

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

type SectionItems = ServiceTemplateProps["items"];

interface PremiumSectionDef {
  sectionId: string;
  label: string;
  description: string;
  imageSrc: string;
  videoSrc: string;
  items: SectionItems;
  indexOffset: number;
}

interface ChapterDef {
  id: string;
  label: string;
  description: string;
  imageSrc: string;
  videoSrc: string;
  items: SectionItems;
  indexOffset: number;
}

// ─── CollectionListHeader ─────────────────────────────────────────────────────

/**
 * The heading row shown at the top of the whole list (mirrors LedgerList's
 * header row). Rendered once regardless of whether sections are active.
 * Lives inside the first light room.
 */
function CollectionListHeader({
  listHeading,
  listIntro,
  showBorder = true,
}: {
  listHeading: string;
  listIntro: string;
  /** Drop the divider when a sticky nav follows (its own border separates). */
  showBorder?: boolean;
}) {
  const { ref, visible } = useViiReveal(0.08);
  const hasHeading = listHeading.trim().length > 0;
  const hasIntro = listIntro.trim().length > 0;
  // Heading is optional — when both are blank, render nothing (no fallback).
  if (!hasHeading && !hasIntro) return null;
  return (
    <div
      ref={ref}
      className={cn("vii-reveal vii-ledger-list-row", visible && "is-visible")}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1.4fr",
        gap: "clamp(24px, 4vw, 56px)",
        marginBottom: showBorder
          ? "clamp(32px, 5vw, 56px)"
          : "clamp(20px, 3vw, 32px)",
        paddingBottom: showBorder ? "clamp(24px, 3vw, 40px)" : 0,
        borderBottom: showBorder ? "1px solid var(--vii-tan)" : "none",
        alignItems: "end",
      }}
    >
      {hasHeading && (
        <h2
          id="collection-list-heading"
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
          {listHeading}
        </h2>
      )}

      {hasIntro && (
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

// ─── CollectionSectionNav ─────────────────────────────────────────────────────

/**
 * Sticky scroll-spy navigation bar. Only renders when ≥2 sections will be
 * shown. Uses IntersectionObserver to track the active section.
 */
function CollectionSectionNav({
  navItems,
}: {
  navItems: Array<{ id: string; label: string; isPremium?: boolean }>;
}) {
  const [activeId, setActiveId] = useState<string>("");
  const [prefersReduced, setPrefersReduced] = useState(false);
  // The site header is `position: fixed` and changes height on scroll (the
  // announcement bar hides + padding shrinks). Pin the nav to its LIVE height
  // rather than the static --vii-header-offset, which only matches one state
  // and otherwise leaves a gap above the sticky bar.
  const [headerH, setHeaderH] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPrefersReduced(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Initialise activeId to the first nav item on mount so the bar reads as
  // anchored from the top before any scroll interaction.
  useEffect(() => {
    if (navItems.length < 2) return;
    setActiveId((prev) => {
      if (prev !== "") return prev;
      return navItems[0]?.id ?? "";
    });
  }, [navItems]);

  // Measure the fixed header (and this nav) and keep section scroll-margins in
  // sync via CSS vars, so anchored sections clear both bars when jumped to.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const header = document.querySelector("header");
    if (!header) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const h = header.getBoundingClientRect().height;
      setHeaderH(h);
      const root = document.documentElement;
      root.style.setProperty("--vii-collection-header-h", `${Math.round(h)}px`);
      if (navRef.current) {
        root.style.setProperty(
          "--vii-collection-nav-h",
          `${Math.round(navRef.current.getBoundingClientRect().height)}px`,
        );
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(header);
    if (navRef.current) ro.observe(navRef.current);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (navItems.length < 2) return;

    const targets = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (targets.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Find the topmost intersecting section
        const intersecting = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            const aTop = a.boundingClientRect.top;
            const bTop = b.boundingClientRect.top;
            return aTop - bTop;
          });
        if (intersecting.length > 0 && intersecting[0]) {
          setActiveId(intersecting[0].target.id);
        }
      },
      {
        threshold: 0,
        rootMargin: "-10% 0px -70% 0px",
      },
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [navItems]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start",
      });
    },
    [prefersReduced],
  );

  if (navItems.length < 2) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Service sections"
      style={{
        position: "sticky",
        top: headerH != null ? `${headerH}px` : "var(--vii-header-offset)",
        zIndex: 40,
        background: "var(--vii-paper)",
        borderBottom: "1px solid var(--vii-tan)",
      }}
    >
      <style>{`
        .vii-collection-nav-list {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 0;
          padding: 0 clamp(24px, 6vw, 96px);
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .vii-collection-nav-list::-webkit-scrollbar { display: none; }
        .vii-collection-nav-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          min-height: 44px;
          padding: 0 16px;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          color: var(--vii-ink-soft);
          border-bottom: 2px solid transparent;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .vii-collection-nav-link[aria-current="true"] {
          color: var(--vii-navy);
          border-bottom-color: var(--vii-copper);
        }
        .vii-collection-nav-link:hover:not([aria-current="true"]) {
          color: var(--vii-navy);
        }
        .vii-collection-nav-premium {
          color: var(--vii-copper-light);
          font-size: 10px;
        }
      `}</style>
      <ul className="vii-collection-nav-list" role="list" style={{ margin: 0 }}>
        {navItems.map((item) => (
          <li key={item.id} style={{ listStyle: "none" }}>
            <a
              href={`#${item.id}`}
              className="vii-collection-nav-link"
              aria-current={activeId === item.id ? "true" : undefined}
              onClick={(e) => handleClick(e, item.id)}
            >
              {item.label}
              {item.isPremium && (
                <span className="vii-collection-nav-premium" aria-hidden="true">
                  ✦
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── SignatureFeature ─────────────────────────────────────────────────────────

/**
 * Optional feature spotlight for the first published item with isSignature=true.
 * Placed inside the first light room, after the list header.
 * That item is excluded from the section rows to avoid duplication.
 */
function SignatureFeature({
  item,
  embedsEnabled,
}: {
  item: ServiceTemplateProps["items"][number];
  embedsEnabled: boolean;
}) {
  const { ref, visible } = useViiReveal(0.08);
  const priceTiers = parseServicePriceTiers(item.priceTiers);
  const hasImage = !!item.image?.trim();

  return (
    <div
      ref={ref}
      className={cn(
        "vii-reveal vii-signature-feature-grid",
        visible && "is-visible",
      )}
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        background: "var(--vii-cream)",
        border: "1px solid var(--vii-tan)",
        borderRadius: "0.35rem",
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: hasImage ? "1fr 1.2fr" : "1fr",
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .vii-signature-feature-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* Content column */}
      <div
        style={{
          padding: "clamp(32px, 5vw, 56px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--vii-copper)",
            margin: 0,
          }}
        >
          <span aria-hidden="true">✦</span> Signature
        </p>

        {/* Name */}
        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: "clamp(26px, 3.5vw, 42px)",
            lineHeight: 1.1,
            color: "var(--vii-navy)",
            margin: 0,
            textWrap: "balance",
          }}
        >
          {item.name}
        </h3>

        {/* Description */}
        {item.description && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(13px, 1.2vw, 15px)",
              lineHeight: 1.8,
              color: "var(--vii-ink-soft)",
              margin: 0,
              maxWidth: "60ch",
            }}
          >
            {item.description}
          </p>
        )}

        {/* Price tiers */}
        {priceTiers.length > 0 && (
          <div>
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 9,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                marginBottom: 8,
              }}
            >
              Pricing
            </p>
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}
            >
              {priceTiers.map((tier: ServicePriceTier, i: number) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  <span>{tier.label}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      color: "var(--vii-copper-light)",
                      flexShrink: 0,
                    }}
                  >
                    —
                  </span>
                  {tier.compareAtPriceLabel && (
                    <span
                      style={{
                        textDecoration: "line-through",
                        opacity: 0.55,
                      }}
                    >
                      {tier.compareAtPriceLabel}
                    </span>
                  )}
                  <span style={{ color: "var(--vii-navy)", fontWeight: 500 }}>
                    {tier.priceLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Single price pill fallback */}
        {priceTiers.length === 0 && item.priceLabel && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vii-navy)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            {item.priceLabel}
          </p>
        )}

        {/* Book CTA */}
        <div className="vii-ledger-book" style={{ marginTop: 4 }}>
          <ServiceBookingDialog
            triggerLabel="Book →"
            itemName={item.name}
            embedSrc={item.bookingEmbedSrc ?? undefined}
            embedHeight={item.bookingEmbedHeight ?? undefined}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </div>

      {/* Image column */}
      {hasImage && (
        <div
          style={{
            position: "relative",
            minHeight: 320,
            overflow: "hidden",
          }}
        >
          <Image
            src={item.image!}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Chapter ──────────────────────────────────────────────────────────────────

/**
 * One non-premium chapter rendered inside a light (paper) room.
 * Each chapter gets an id for scroll-spy anchoring.
 */
function Chapter({
  id,
  label,
  description,
  imageSrc,
  videoSrc,
  items,
  embedsEnabled,
  indexOffset,
  isFirst,
}: {
  id: string;
  label: string;
  description: string;
  imageSrc: string;
  videoSrc: string;
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  indexOffset: number;
  /** True when this is the first chapter in its room (no leading hairline/gap). */
  isFirst: boolean;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.08);
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.08);

  const hasMedia = videoSrc.trim().length > 0 || imageSrc.trim().length > 0;
  const hasDescription = description.trim().length > 0;
  const itemCount = items.length;
  const countLabel =
    itemCount === 0
      ? null
      : `${itemCount} ${itemCount === 1 ? "treatment" : "treatments"}`;

  const hasLabel = label.trim().length > 0;

  return (
    <div
      id={id}
      {...(hasLabel
        ? { "aria-labelledby": `${id}-heading` }
        : { "aria-label": "More treatments" })}
      style={{
        marginTop: isFirst ? 0 : "clamp(48px, 7vw, 72px)",
        paddingTop: isFirst ? 0 : "clamp(48px, 7vw, 72px)",
        borderTop: isFirst ? "none" : "1px solid var(--vii-tan)",
        scrollMarginTop:
          "calc(var(--vii-collection-header-h, var(--vii-header-offset)) + var(--vii-collection-nav-h, 45px) + 8px)",
      }}
    >
      {/* Chapter header */}
      {(label || hasDescription || hasMedia) && (
        <div
          ref={headRef}
          className={cn("vii-reveal", headVisible && "is-visible")}
          style={{
            marginBottom: "clamp(20px, 3vw, 32px)",
            paddingBottom: "clamp(16px, 2vw, 28px)",
            borderBottom: "1px solid var(--vii-tan)",
          }}
        >
          {/* Label + count row */}
          {label && (
            <div
              className="vii-collection-chapter-grid"
              style={{
                display: "grid",
                gridTemplateColumns: hasDescription ? "1fr 1.4fr" : "1fr auto",
                gap: "clamp(16px, 3vw, 40px)",
                alignItems: hasDescription ? "start" : "baseline",
              }}
            >
              <h3
                id={`${id}-heading`}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontStyle: "italic",
                  fontSize: "clamp(26px, 3.5vw, 42px)",
                  lineHeight: 1.1,
                  color: "var(--vii-navy)",
                  margin: 0,
                  textWrap: "balance",
                }}
              >
                {label}
              </h3>

              {hasDescription ? (
                /* Description on the right when description present */
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(13px, 1.2vw, 15px)",
                    lineHeight: 1.75,
                    color: "var(--vii-ink-soft)",
                    margin: "4px 0 0",
                    maxWidth: "60ch",
                  }}
                >
                  {description}
                </p>
              ) : (
                /* Count meta on the right when no description */
                countLabel && (
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--vii-ink-soft)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {countLabel}
                  </span>
                )
              )}
            </div>
          )}

          {/* Count meta below label when description also present */}
          {label && hasDescription && countLabel && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
                margin: "10px 0 0",
              }}
            >
              {countLabel}
            </p>
          )}

          {/* Optional media banner */}
          {hasMedia && (
            <div style={{ marginTop: "clamp(20px, 3vw, 28px)" }}>
              <ServiceSectionMedia
                imageSrc={imageSrc || undefined}
                videoSrc={videoSrc || undefined}
                alt={label ? `${label} section` : ""}
                style={{
                  maxWidth: 680,
                  aspectRatio: "16/9",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Item rows */}
      {items.length > 0 && (
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
              index={indexOffset + i}
              tone="light"
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SlateRoom ────────────────────────────────────────────────────────────────

/**
 * Full-bleed slate room for the premium/signature section.
 * Uses var(--vii-slate) instead of navy so when it lands last it steps
 * cleanly into the navy LedgerNotes without a stray cream seam.
 */
function SlateRoom({
  id,
  label,
  description,
  imageSrc,
  videoSrc,
  items,
  embedsEnabled,
  indexOffset,
}: {
  id: string;
  label: string;
  description: string;
  imageSrc: string;
  videoSrc: string;
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;
  indexOffset: number;
}) {
  const { ref: headRef, visible: headVisible } = useViiReveal(0.08);
  const { ref: rowsRef, visible: rowsVisible } = useViiReveal(0.08);

  const hasMedia = videoSrc.trim().length > 0 || imageSrc.trim().length > 0;
  const hasDescription = description.trim().length > 0;
  const itemCount = items.length;
  const countLabel =
    itemCount === 0
      ? null
      : `${itemCount} ${itemCount === 1 ? "treatment" : "treatments"}`;

  const hasLabel = label.trim().length > 0;

  return (
    <section
      id={id}
      className="vii-ledger-list--dark"
      {...(hasLabel
        ? { "aria-labelledby": `${id}-heading` }
        : { "aria-label": "Signature Collection" })}
      style={{
        background: "var(--vii-slate)",
        padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 96px)",
        scrollMarginTop:
          "calc(var(--vii-collection-header-h, var(--vii-header-offset)) + var(--vii-collection-nav-h, 45px) + 8px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Chapter header */}
        <div
          ref={headRef}
          className={cn("vii-reveal", headVisible && "is-visible")}
          style={{
            marginBottom: "clamp(20px, 3vw, 32px)",
            paddingBottom: "clamp(16px, 2vw, 28px)",
            borderBottom:
              "1px solid color-mix(in srgb, var(--vii-paper) 18%, transparent)",
          }}
        >
          {/* Eyebrow */}
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--vii-tan)",
              margin: "0 0 14px",
            }}
          >
            <span
              aria-hidden="true"
              style={{ color: "var(--vii-copper-light)" }}
            >
              ✦
            </span>{" "}
            Signature Collection
          </p>

          {/* Label + count row */}
          {label && (
            <div
              className="vii-collection-chapter-grid"
              style={{
                display: "grid",
                gridTemplateColumns: hasDescription ? "1fr 1.4fr" : "1fr auto",
                gap: "clamp(16px, 3vw, 40px)",
                alignItems: hasDescription ? "start" : "baseline",
              }}
            >
              <h3
                id={`${id}-heading`}
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontStyle: "normal",
                  fontSize: "clamp(26px, 3.5vw, 42px)",
                  lineHeight: 1.1,
                  color: "var(--vii-paper)",
                  margin: 0,
                  textWrap: "balance",
                }}
              >
                {label}
              </h3>

              {hasDescription ? (
                /* Description on the right when description present */
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "clamp(13px, 1.2vw, 15px)",
                    lineHeight: 1.75,
                    color:
                      "color-mix(in srgb, var(--vii-paper) 80%, var(--vii-slate))",
                    margin: "4px 0 0",
                    maxWidth: "60ch",
                  }}
                >
                  {description}
                </p>
              ) : (
                /* Count meta on the right when no description */
                countLabel && (
                  <span
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      color: "var(--vii-tan)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {countLabel}
                  </span>
                )
              )}
            </div>
          )}

          {/* Count meta below label when description also present */}
          {label && hasDescription && countLabel && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--vii-tan)",
                margin: "10px 0 0",
              }}
            >
              {countLabel}
            </p>
          )}

          {/* Optional media banner */}
          {hasMedia && (
            <div style={{ marginTop: "clamp(20px, 3vw, 28px)" }}>
              <ServiceSectionMedia
                imageSrc={imageSrc || undefined}
                videoSrc={videoSrc || undefined}
                alt={label ? `${label} section` : ""}
                style={{
                  maxWidth: 680,
                  aspectRatio: "16/9",
                }}
              />
            </div>
          )}
        </div>

        {/* Item rows */}
        {items.length > 0 && (
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
                index={indexOffset + i}
                tone="dark"
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── LightRoom ────────────────────────────────────────────────────────────────

/**
 * A paper-background room containing one or more chapters. Returns null when
 * empty. `compactTop` trims the top padding for the room that directly follows
 * the header room + sticky nav (so the heading and first chapter don't drift
 * apart); rooms that follow the slate room keep full top padding.
 */
function LightRoom({
  chapters,
  compactTop,
  embedsEnabled,
}: {
  chapters: ChapterDef[];
  compactTop: boolean;
  embedsEnabled: boolean;
}) {
  if (chapters.length === 0) return null;

  const padTop = compactTop
    ? "clamp(24px, 3.5vw, 40px)"
    : "clamp(72px, 10vw, 120px)";

  return (
    <section
      style={{
        background: "var(--vii-paper)",
        padding: `${padTop} clamp(24px, 6vw, 96px) clamp(72px, 10vw, 120px)`,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {chapters.map((ch, i) => (
          <Chapter
            key={ch.id}
            id={ch.id}
            label={ch.label}
            description={ch.description}
            imageSrc={ch.imageSrc}
            videoSrc={ch.videoSrc}
            items={ch.items}
            embedsEnabled={embedsEnabled}
            indexOffset={ch.indexOffset}
            isFirst={i === 0}
          />
        ))}
      </div>
    </section>
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

  // Find the signature item — first published item with isSignature=true
  const signatureItem = items.find((it) => it.isSignature === true) ?? null;

  // Items to show in section rows — exclude the signature item to avoid duplication
  const rowItems = (sectionId: string) =>
    itemsBySection(sectionId).filter((it) => it.id !== signatureItem?.id);

  const unassignedRowItems = unassignedItems.filter(
    (it) => it.id !== signatureItem?.id,
  );

  // Find the first premium section (first row with premium === "true")
  const premiumSectionId = (() => {
    for (const s of sections) {
      if (asStr(s.premium) === "true") return String(s._id ?? "");
    }
    return null;
  })();

  // Build nav items — only sections that will actually render (have label or items)
  type NavItem = { id: string; label: string; isPremium?: boolean };
  const navItems: NavItem[] = [];

  if (sections.length > 0) {
    sections.forEach((s) => {
      const sectionId = String(s._id ?? "");
      const label = asStr(s.label).trim();
      const sItems = rowItems(sectionId);
      if (!label && sItems.length === 0) return;
      navItems.push({
        id: `section-${sectionId}`,
        label: label || "Treatments",
        isPremium: sectionId === premiumSectionId,
      });
    });

    if (unassignedRowItems.length > 0) {
      navItems.push({ id: "section-more", label: "More" });
    }
  }

  // Compute cumulative index offsets for stagger reveal (excluding signature item)
  const getIndexOffset = (upToIndex: number): number => {
    let count = 0;
    for (let i = 0; i < upToIndex; i++) {
      const s = sections[i];
      if (!s) continue;
      count += rowItems(String(s._id ?? "")).length;
    }
    return count;
  };

  // Pre-compute non-signature flat items once for the fallback path
  const flatRowItems = items.filter((it) => it.id !== signatureItem?.id);
  const flatRowCount = flatRowItems.length;

  // Heading is fully optional — when blank, no heading renders (no fallback)
  // and the header room is omitted so the nav sits flush.
  const hasHeaderText = listHeading.trim().length > 0;
  const hasHeaderContent = hasHeaderText || listIntro.trim().length > 0;

  return (
    <section
      {...(hasHeaderText
        ? { "aria-labelledby": "collection-list-heading" }
        : { "aria-label": "Treatments" })}
    >
      <LedgerListStyles />

      {/* Responsive rule for the chapter-header grid — guaranteed to be present
          for every Chapter/SlateRoom render, including when the nav is hidden. */}
      <style>{`
        @media (max-width: 640px) {
          .vii-collection-chapter-grid {
            grid-template-columns: 1fr !important;
            align-items: start !important;
          }
        }
      `}</style>

      {sections.length === 0 ? (
        /* ── Fallback: flat list (no sections configured yet) ── */
        <div
          style={{
            background: "var(--vii-paper)",
            padding: "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px)",
          }}
        >
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <CollectionListHeader
              listHeading={listHeading}
              listIntro={listIntro}
              showBorder={true}
            />

            {signatureItem && (
              <div
                style={{
                  marginTop: hasHeaderContent ? "clamp(32px, 5vw, 56px)" : 0,
                }}
              >
                <SignatureFeature
                  item={signatureItem}
                  embedsEnabled={embedsEnabled}
                />
              </div>
            )}

            <div
              style={{
                marginTop: signatureItem
                  ? "clamp(48px, 7vw, 72px)"
                  : hasHeaderContent
                    ? "clamp(32px, 5vw, 56px)"
                    : 0,
              }}
            >
              <div
                ref={fallbackRef}
                className={cn(
                  "vii-reveal-group",
                  fallbackVisible && "is-visible",
                )}
              >
                {flatRowItems.map((item, i) => (
                  <TreatmentListRow
                    key={item.id}
                    item={item}
                    embedsEnabled={embedsEnabled}
                    isLast={i === flatRowCount - 1}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Sectioned layout: full-bleed sibling rooms ── */
        (() => {
          // Split non-premium renderable sections into before/after groups,
          // relative to the single premium section (if any).
          const beforeChapters: ChapterDef[] = [];
          const afterChapters: ChapterDef[] = [];
          let premiumSection: PremiumSectionDef | null = null;
          let passedPremium = false;

          sections.forEach((s, si) => {
            const sectionId = String(s._id ?? "");
            const label = asStr(s.label).trim();
            const description = asStr(s.description).trim();
            const imageSrc = asStr(s.image).trim();
            const videoSrc = asStr(s.video).trim();
            const sectionRowItems = rowItems(sectionId);
            const offset = getIndexOffset(si);

            // Skip sections with neither a label nor items
            if (!label && sectionRowItems.length === 0) return;

            if (sectionId === premiumSectionId) {
              premiumSection = {
                sectionId,
                label,
                description,
                imageSrc,
                videoSrc,
                items: sectionRowItems,
                indexOffset: offset,
              };
              passedPremium = true;
            } else {
              const chDef: ChapterDef = {
                id: `section-${sectionId}`,
                label,
                description,
                imageSrc,
                videoSrc,
                items: sectionRowItems,
                indexOffset: offset,
              };
              (passedPremium ? afterChapters : beforeChapters).push(chDef);
            }
          });

          // Unassigned / orphan items trail the after-group when a premium
          // section exists; otherwise they extend the single before-group so
          // they stay in one continuous paper room (no stray seam).
          if (unassignedRowItems.length > 0) {
            const orphanOffset = sections.reduce(
              (acc, s) => acc + rowItems(String(s._id ?? "")).length,
              0,
            );
            const orphanChapter: ChapterDef = {
              id: "section-more",
              label: "",
              description: "",
              imageSrc: "",
              videoSrc: "",
              items: unassignedRowItems,
              indexOffset: orphanOffset,
            };
            (premiumSection ? afterChapters : beforeChapters).push(
              orphanChapter,
            );
          }

          return (
            <>
              {/* Header room — heading and/or signature spotlight. Omitted
                  entirely when both are blank so the nav sits flush.
                  `display: flow-root` contains the heading's bottom margin so
                  it paints paper (not a stray cream strip above the nav). */}
              {(hasHeaderContent || signatureItem) && (
                <section
                  style={{
                    background: "var(--vii-paper)",
                    display: "flow-root",
                    padding:
                      "clamp(72px, 10vw, 120px) clamp(24px, 6vw, 96px) 0",
                  }}
                >
                  <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <CollectionListHeader
                      listHeading={listHeading}
                      listIntro={listIntro}
                      showBorder={navItems.length < 2}
                    />
                    {signatureItem && (
                      <div
                        style={{
                          marginTop: hasHeaderContent
                            ? "clamp(32px, 5vw, 56px)"
                            : 0,
                        }}
                      >
                        <SignatureFeature
                          item={signatureItem}
                          embedsEnabled={embedsEnabled}
                        />
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Sticky scroll-spy nav — single sibling so it sticks across
                  every room below it. Returns null when < 2 sections. */}
              <CollectionSectionNav navItems={navItems} />

              {/* Light room A — chapters before the premium section */}
              <LightRoom
                chapters={beforeChapters}
                compactTop={
                  hasHeaderContent ||
                  signatureItem !== null ||
                  navItems.length >= 2
                }
                embedsEnabled={embedsEnabled}
              />

              {/* Slate room — premium section (steps off the navy notes) */}
              {premiumSection !== null &&
                (() => {
                  const ps: PremiumSectionDef = premiumSection;
                  return (
                    <SlateRoom
                      id={`section-${ps.sectionId}`}
                      label={ps.label}
                      description={ps.description}
                      imageSrc={ps.imageSrc}
                      videoSrc={ps.videoSrc}
                      items={ps.items}
                      embedsEnabled={embedsEnabled}
                      indexOffset={ps.indexOffset}
                    />
                  );
                })()}

              {/* Light room B — chapters after the premium section + orphan */}
              <LightRoom
                chapters={afterChapters}
                compactTop={false}
                embedsEnabled={embedsEnabled}
              />
            </>
          );
        })()
      )}
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
    "vii-collection.cta-show-phone",
    "vii-collection.cta-show-email",
  ]);

  const introBodyJson = parseTemplateRichtext(
    cf?.["vii-collection.intro-body"],
  );

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
        showPhone={f["vii-collection.cta-show-phone"] !== "false"}
        showEmail={f["vii-collection.cta-show-email"] !== "false"}
      />
    </PageTransition>
  );
}
