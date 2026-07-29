"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { ServiceTemplateProps } from "~/app/(storefront)/_templates/_service-pages/registry";
import type { RichTextFieldValue } from "~/lib/template-fields";
import {
  parseServiceAddOns,
  parseServicePriceTiers,
} from "~/lib/validators/services";
import { ServiceBookingDialog } from "~/components/service-booking-dialog";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { PinkAccordion } from "../../shared/pink-accordion";
import { PinkReveal } from "../../shared/pink-reveal";
import { PinkTableRequestForm } from "./pink-table-request-form";

type TimelineRow = { time: string; title: string; body: string; _id?: string };
type TextRow = { text: string; _id?: string };
type GalleryImage = { image: string; alt: string; _id?: string };
type FaqRow = { question: string; answer: string; _id?: string };

type Props = {
  items: ServiceTemplateProps["items"];
  embedsEnabled: boolean;

  bodyHeading: string;
  bodyParagraphs: string[];
  richText: RichTextFieldValue | null;

  pickerHeading: string;
  pickerIntro: string;

  timelineHeading: string;
  timeline: TimelineRow[];

  bringsLabel: string;
  brings: TextRow[];
  providesLabel: string;
  provides: TextRow[];

  gallery: GalleryImage[];

  quoteText: string;
  quoteAttribution: string;

  faqHeading: string;
  faq: FaqRow[];

  priceEyebrow: string;
  priceQualifier: string;
  priceCtaLabel: string;
  quicklink1Label: string;
  quicklink2Label: string;
  quicklink2Href: string;

  requestHeading: string;
  requestIntro: string;
  requestSubmitLabel: string;
  requestFallbackLabel: string;

  serviceName: string;
};

/**
 * The interactive two-column body of the `pink-table` service detail page
 * (design.md → Service detail — pink-table → Body + Sticky sidebar). Client
 * component so the project picker and the sidebar price panel can share
 * `selectedItemId` state — selecting a project swaps the sidebar to show
 * that item's own `priceLabel`/`priceTiers`/`addOns`. This is a
 * presentational selector only: nothing is computed, every value shown was
 * already on the `ServiceItem` record (design.md's people-slider estimator
 * is deliberately dropped — see the build report for why).
 */
export function PinkTableBody({
  items,
  embedsEnabled,
  bodyHeading,
  bodyParagraphs,
  richText,
  pickerHeading,
  pickerIntro,
  timelineHeading,
  timeline,
  bringsLabel,
  brings,
  providesLabel,
  provides,
  gallery,
  quoteText,
  quoteAttribution,
  faqHeading,
  faq,
  priceEyebrow,
  priceQualifier,
  priceCtaLabel,
  quicklink1Label,
  quicklink2Label,
  quicklink2Href,
  requestHeading,
  requestIntro,
  requestSubmitLabel,
  requestFallbackLabel,
  serviceName,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(items[0]?.id);
  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const priceTiers = selectedItem ? parseServicePriceTiers(selectedItem.priceTiers) : [];
  const addOns = selectedItem ? parseServiceAddOns(selectedItem.addOns) : [];

  const showBringsProvides = brings.length > 0 || provides.length > 0;

  return (
    <div
      className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-[52px] px-5 py-14 md:px-10 md:py-[56px] lg:grid-cols-[minmax(0,1fr)_minmax(0,368px)]"
    >
      {/* ── Left column ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-16">
        {/* What it actually is */}
        <PinkReveal as="section">
          <h2
            className="pink-display"
            style={{ fontSize: "28px", fontWeight: 600, letterSpacing: "-0.02em" }}
          >
            {bodyHeading}
          </h2>
          <div className="mt-4 max-w-[64ch]">
            {richText ? (
              <TiptapRenderer content={richText} className="pink-prose" />
            ) : (
              <div className="flex flex-col gap-4">
                {bodyParagraphs
                  .filter((p) => p.length > 0)
                  .map((p, i) => (
                    <p key={i} className="text-[17px] leading-[1.8]" style={{ color: "var(--pink-body)" }}>
                      {p}
                    </p>
                  ))}
              </div>
            )}
          </div>
        </PinkReveal>

        {/* Project picker */}
        {items.length > 0 && (
          <PinkReveal as="section">
            <h2 className="pink-display text-[22px]" style={{ fontWeight: 600 }}>
              {pickerHeading}
            </h2>
            {pickerIntro && (
              <p className="mt-1.5 text-[15px]" style={{ color: "var(--pink-muted)" }}>
                {pickerIntro}
              </p>
            )}

            <div
              role="group"
              aria-label={pickerHeading}
              className="pink-hairline-grid mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {items.map((item) => {
                const isSelected = item.id === selectedItem?.id;
                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedId(item.id)}
                      className="flex flex-1 flex-col text-left transition-colors"
                      style={{
                        background: isSelected ? "var(--pink-ink)" : "var(--pink-paper)",
                      }}
                    >
                      <div
                        className="relative w-full"
                        style={{ aspectRatio: "4 / 3", background: "var(--pink-panel)" }}
                      >
                        <Image
                          src={item.image ?? "/placeholder.svg"}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                      <div className="flex flex-1 flex-col gap-1.5 p-4">
                        <span
                          className="pink-display text-[18px]"
                          style={{
                            fontWeight: 600,
                            color: isSelected ? "var(--pink-paper)" : "var(--pink-ink)",
                          }}
                        >
                          {item.name}
                        </span>
                        {item.description && (
                          <span
                            className="text-[14px] leading-[1.6]"
                            style={{ color: isSelected ? "var(--pink-ink-muted)" : "var(--pink-muted)" }}
                          >
                            {item.description}
                          </span>
                        )}
                        <span
                          className="mt-auto pt-2 text-[14px] font-medium"
                          style={{ color: isSelected ? "var(--pink-petal)" : "var(--pink-ink)" }}
                        >
                          {[item.priceLabel, item.category].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </button>

                    {item.bookingEmbedSrc && (
                      <div className="pink-table-book px-4 pb-4">
                        <ServiceBookingDialog
                          triggerLabel="Book →"
                          itemName={item.name}
                          embedSrc={item.bookingEmbedSrc}
                          embedHeight={item.bookingEmbedHeight}
                          embedsEnabled={embedsEnabled}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </PinkReveal>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <PinkReveal as="section">
            <h2 className="pink-display text-[22px]" style={{ fontWeight: 600 }}>
              {timelineHeading}
            </h2>
            <div className="mt-4" style={{ borderTop: "1px solid var(--pink-ink)" }}>
              {timeline.map((row, i) => (
                <div
                  key={row._id ?? i}
                  className="grid grid-cols-[96px_minmax(0,1fr)] gap-4 py-5"
                  style={{ borderBottom: "1px solid var(--pink-line)" }}
                >
                  <span className="pink-display text-[15px]" style={{ fontWeight: 600, color: "var(--pink-rose)" }}>
                    {row.time}
                  </span>
                  <div>
                    <p className="pink-display text-[16px]" style={{ fontWeight: 600 }}>
                      {row.title}
                    </p>
                    {row.body && (
                      <p className="mt-1 text-[15px] leading-[1.7]" style={{ color: "var(--pink-body)" }}>
                        {row.body}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </PinkReveal>
        )}

        {/* Brings / provides */}
        {showBringsProvides && (
          <PinkReveal as="section" className="grid grid-cols-1 gap-[1px] sm:grid-cols-2" style={{ background: "var(--pink-line)", border: "1px solid var(--pink-line)" }}>
            <div className="p-6" style={{ background: "var(--pink-paper)" }}>
              <p className="pink-label">{bringsLabel}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {brings.map((row, i) => (
                  <li key={row._id ?? i} className="flex gap-2 text-[15px]" style={{ color: "var(--pink-body)" }}>
                    <span aria-hidden="true" style={{ color: "var(--pink-rose)" }}>
                      —
                    </span>
                    {row.text}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-6" style={{ background: "var(--pink-paper)" }}>
              <p className="pink-label">{providesLabel}</p>
              <ul className="mt-3 flex flex-col gap-2">
                {provides.map((row, i) => (
                  <li key={row._id ?? i} className="flex gap-2 text-[15px]" style={{ color: "var(--pink-body)" }}>
                    <span aria-hidden="true" style={{ color: "var(--pink-rose)" }}>
                      —
                    </span>
                    {row.text}
                  </li>
                ))}
              </ul>
            </div>
          </PinkReveal>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <PinkReveal as="section" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {gallery.map((img, i) => (
              <div
                key={img._id ?? i}
                className="relative"
                style={{ aspectRatio: "4 / 3", background: "var(--pink-panel)" }}
              >
                <Image
                  src={img.image || "/placeholder.svg"}
                  alt={img.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
            ))}
          </PinkReveal>
        )}

        {/* Pull-quote */}
        {quoteText && (
          <PinkReveal as="section">
            <blockquote
              style={{
                borderLeft: "3px solid var(--pink-rose)",
                paddingLeft: 24,
              }}
            >
              <p className="pink-display text-[24px]" style={{ fontWeight: 600, lineHeight: 1.4 }}>
                {quoteText}
              </p>
              {quoteAttribution && (
                <footer className="mt-3 text-[14px]" style={{ color: "var(--pink-subtle)" }}>
                  — {quoteAttribution}
                </footer>
              )}
            </blockquote>
          </PinkReveal>
        )}

        {/* FAQ */}
        {faq.length > 0 && (
          <PinkReveal as="section">
            <h2 className="pink-display text-[22px]" style={{ fontWeight: 600 }}>
              {faqHeading}
            </h2>
            <PinkAccordion
              className="mt-4"
              items={faq.map((row) => ({
                id: row._id,
                title: row.question,
                content: row.answer,
              }))}
            />
          </PinkReveal>
        )}
      </div>

      {/* ── Sticky sidebar ──────────────────────────────────────────────── */}
      <aside className="flex h-fit flex-col gap-[2px] lg:sticky" style={{ top: "var(--pink-sticky-top)" }}>
        <div className="flex flex-col gap-4 p-6" style={{ background: "var(--pink-ink)" }}>
          <p className="pink-label-dark">{priceEyebrow}</p>
          <p className="pink-display text-[34px]" style={{ fontWeight: 600, color: "var(--pink-paper)" }}>
            {selectedItem?.priceLabel ?? "Ask for pricing"}
          </p>
          {priceQualifier && (
            <p className="text-[13px]" style={{ color: "var(--pink-ink-muted)" }}>
              {priceQualifier}
            </p>
          )}

          {(priceTiers.length > 0 || addOns.length > 0) && (
            <div className="flex flex-col" style={{ borderTop: "1px solid var(--pink-ink-line)" }}>
              {priceTiers.map((tier, i) => (
                <div
                  key={`tier-${i}`}
                  className="flex items-baseline justify-between gap-3 py-2.5 text-[13px]"
                  style={{ borderBottom: "1px solid var(--pink-ink-line)", color: "var(--pink-ink-body)" }}
                >
                  <span>{tier.label}</span>
                  <span style={{ fontWeight: 600 }}>{tier.priceLabel}</span>
                </div>
              ))}
              {addOns.map((addon, i) => (
                <div
                  key={`addon-${i}`}
                  className="flex items-baseline justify-between gap-3 py-2.5 text-[13px]"
                  style={{ borderBottom: "1px solid var(--pink-ink-line)", color: "var(--pink-ink-body)" }}
                >
                  <span>{addon.name}</span>
                  {addon.priceLabel && <span style={{ fontWeight: 600 }}>{addon.priceLabel}</span>}
                </div>
              ))}
            </div>
          )}

          <a href="#request-form" className="pink-btn pink-btn-solid mt-2 w-full justify-center">
            {priceCtaLabel}
          </a>
        </div>

        <div id="request-form">
          <PinkTableRequestForm
            serviceName={serviceName}
            heading={requestHeading}
            intro={requestIntro}
            submitLabel={requestSubmitLabel}
            fallbackLabel={requestFallbackLabel}
          />
        </div>

        <div className="grid grid-cols-1 gap-[2px]">
          <Link
            href="/services"
            className="flex items-center justify-between gap-3 p-4 text-[15px] transition-colors hover:opacity-80"
            style={{ background: "var(--pink-panel)", color: "var(--pink-ink)" }}
          >
            {quicklink1Label}
            <span aria-hidden="true">→</span>
          </Link>
          {quicklink2Label && (
            <Link
              href={quicklink2Href || "/shop"}
              className="flex items-center justify-between gap-3 p-4 text-[15px] transition-colors hover:opacity-80"
              style={{ background: "var(--pink-panel)", color: "var(--pink-ink)" }}
            >
              {quicklink2Label}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>
      </aside>

      <style>{`
        .pink-table-book button,
        .pink-table-book a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 0;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: var(--pink-rose) !important;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .pink-table-book button:disabled {
          color: var(--pink-subtle) !important;
          text-decoration: none;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
