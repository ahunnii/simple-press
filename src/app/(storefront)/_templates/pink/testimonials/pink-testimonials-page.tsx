import Image from "next/image";
import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import { parseTemplateListRows } from "~/lib/template-fields";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkPageHeader } from "../shared/pink-page-header";
import type { PinkStat } from "../shared/pink-stat-tiles";
import { PinkStatTiles } from "../shared/pink-stat-tiles";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkRule } from "../shared/pink-rule";
import { PinkTestimonialsGrid } from "./pink-testimonials-grid";

const FIELD_KEYS = [
  "pink.testimonials.header-eyebrow",
  "pink.testimonials.header-heading",
  "pink.testimonials.header-intro",
  "pink.testimonials.featured-link-label",
  "pink.testimonials.grid-heading-suffix",
  "pink.testimonials.grid-filter-all-label",
  "pink.testimonials.grid-filter-keeper-label",
  "pink.testimonials.grid-filter-studio-label",
  "pink.testimonials.grid-empty-heading",
  "pink.testimonials.grid-empty-body",
  "pink.testimonials.press-heading",
  "pink.testimonials.press-note",
  "pink.testimonials.cta-eyebrow",
  "pink.testimonials.cta-heading",
  "pink.testimonials.cta-body",
  "pink.testimonials.cta-button-label",
  "pink.testimonials.cta-button-link",
];

type PressItem = { outlet?: string; date?: string; quote?: string; href?: string; _id?: string };

const DEFAULT_STATS: PinkStat[] = [
  { value: "400+", label: "Keepers so far" },
  { value: "20+", label: "Years sewing" },
  { value: "48", label: "Pieces this year" },
  { value: "100%", label: "Handmade" },
];

const DEFAULT_PRESS: PressItem[] = [
  {
    outlet: "Local Makers Weekly",
    date: "2024",
    quote: "Spirit dolls that look like they've always been in the room — that's the PinkArt signature.",
    href: "/about",
  },
  {
    outlet: "Detroit Craft & Culture Journal",
    date: "2023",
    quote: "Every piece carries the marks of a hand that's been doing this for twenty years.",
    href: "/about",
  },
];

export async function PinkTestimonialsPage({ business }: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const customFields = business.siteContent?.customFields;
  const rawCustomFields = customFields as Record<string, unknown> | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const statsRaw = parseTemplateListRows(
    rawCustomFields?.["pink.testimonials.header-stats"],
  ) as PinkStat[];
  const stats = statsRaw.length > 0 ? statsRaw : DEFAULT_STATS;

  const pressRaw = parseTemplateListRows(
    rawCustomFields?.["pink.testimonials.press-items"],
  ) as PressItem[];
  const press = pressRaw.length > 0 ? pressRaw : DEFAULT_PRESS;

  const featuredVisible = isSectionVisible(customFields, "pink", "testimonials.featured");
  const pressVisible = isSectionVisible(customFields, "pink", "testimonials.press");
  const ctaVisible = isSectionVisible(customFields, "pink", "testimonials.cta");

  const featured = testimonials[0];
  const featuredPhoto = featured?.photoUrls[0];

  return (
    <>
      {/* ── testimonials.header ────────────────────────────────────────── */}
      <PinkPageHeader
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Testimonials" }]}
        eyebrow={f["pink.testimonials.header-eyebrow"] ?? ""}
        eyebrowFieldKey="pink.testimonials.header-eyebrow"
        heading={f["pink.testimonials.header-heading"] ?? ""}
        headingFieldKey="pink.testimonials.header-heading"
        intro={f["pink.testimonials.header-intro"] ?? ""}
        introFieldKey="pink.testimonials.header-intro"
        rightSlot={<PinkStatTiles stats={stats} columns={4} />}
        sectionAttrs={sectionGroupAttr("testimonials", "header")}
      />

      {/* ── testimonials.featured ──────────────────────────────────────── */}
      {featuredVisible && featured && (
        <section
          className="px-5 py-16 md:px-10 md:py-24"
          {...sectionGroupAttr("testimonials", "featured")}
        >
          {/* Most testimonials carry no photo. Without a photo the image column
              was an empty tinted square the size of the quote — so the band
              drops to a single column and the quote takes the full width. */}
          <PinkReveal
            className={`mx-auto grid max-w-[1400px] gap-8 md:items-center${
              featuredPhoto ? " md:grid-cols-[0.85fr_1.15fr]" : ""
            }`}
            style={{ background: "var(--pink-white)", border: "1px solid var(--pink-line)" }}
          >
            {featuredPhoto && (
              <div
                className="relative aspect-square overflow-hidden"
                style={{ background: "var(--pink-panel)" }}
              >
                <Image
                  src={featuredPhoto}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            )}
            <div className="flex flex-col gap-4 p-8 md:p-12">
              <PinkRule width={42} />
              <p
                className="pink-display"
                style={{
                  fontSize: "clamp(22px, 2.2vw, 30px)",
                  fontWeight: 600,
                  letterSpacing: "-0.015em",
                  lineHeight: 1.25,
                }}
              >
                &ldquo;{featured.text}&rdquo;
              </p>
              <p className="text-[14px]" style={{ color: "var(--pink-subtle)" }}>
                {featured.customerName}
                {(featured.customerTitle ?? featured.customerCompany) && (
                  <> — {featured.customerTitle ?? featured.customerCompany}</>
                )}
              </p>
              {f["pink.testimonials.featured-link-label"] && (
                <a
                  href="#grid"
                  className="mt-2 text-[15px] font-medium"
                  style={{ color: "var(--pink-rose)" }}
                  {...fieldAttr("pink.testimonials.featured-link-label")}
                >
                  {f["pink.testimonials.featured-link-label"]}
                </a>
              )}
            </div>
          </PinkReveal>
        </section>
      )}

      {/* ── testimonials.grid ──────────────────────────────────────────── */}
      <div id="grid">
        <PinkTestimonialsGrid
          testimonials={testimonials}
          headingSuffix={f["pink.testimonials.grid-heading-suffix"] ?? ""}
          allLabel={f["pink.testimonials.grid-filter-all-label"] ?? ""}
          keeperLabel={f["pink.testimonials.grid-filter-keeper-label"] ?? ""}
          studioLabel={f["pink.testimonials.grid-filter-studio-label"] ?? ""}
          emptyHeading={f["pink.testimonials.grid-empty-heading"] ?? ""}
          emptyBody={f["pink.testimonials.grid-empty-body"] ?? ""}
        />
      </div>

      {/* ── testimonials.press ─────────────────────────────────────────── */}
      {pressVisible && (
        <PinkDarkBand ariaLabel="As seen" sectionAttrs={sectionGroupAttr("testimonials", "press")}>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2
              className="pink-display"
              style={{
                fontSize: "clamp(26px, 2.8vw, 38px)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "var(--pink-paper)",
              }}
              {...fieldAttr("pink.testimonials.press-heading")}
            >
              {f["pink.testimonials.press-heading"] ?? ""}
            </h2>
            <p
              className="max-w-[40ch] text-[15px] leading-[1.7]"
              style={{ color: "var(--pink-ink-muted)" }}
              {...fieldAttr("pink.testimonials.press-note")}
            >
              {f["pink.testimonials.press-note"] ?? ""}
            </p>
          </div>

          <div className="grid gap-[2px] sm:grid-cols-2">
            {press.map((item, i) => (
              <PinkReveal
                key={item._id ?? i}
                index={i}
                className="flex flex-col gap-4 p-6"
                style={{ background: "var(--pink-ink-panel)" }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="pink-display text-[15px] font-semibold" style={{ color: "var(--pink-paper)" }}>
                    {item.outlet ?? ""}
                  </span>
                  <span className="text-[13px]" style={{ color: "var(--pink-ink-subtle)" }}>
                    {item.date ?? ""}
                  </span>
                </div>
                <p className="text-[17px] leading-[1.6]" style={{ color: "var(--pink-ink-body)" }}>
                  &ldquo;{item.quote ?? ""}&rdquo;
                </p>
                {item.href && (
                  <a href={item.href} className="text-[14px] font-medium" style={{ color: "var(--pink-blush)" }}>
                    Read the piece →
                  </a>
                )}
              </PinkReveal>
            ))}
          </div>
        </PinkDarkBand>
      )}

      {/* ── testimonials.cta ───────────────────────────────────────────── */}
      {ctaVisible && (
        <section
          className="px-5 py-16 md:px-10 md:py-24"
          {...sectionGroupAttr("testimonials", "cta")}
        >
          <PinkReveal
            className="mx-auto flex max-w-[1400px] flex-col items-start gap-4 p-8 md:p-12"
            style={{ background: "var(--pink-panel)" }}
          >
            <PinkEyebrow tone="paper" fieldKey="pink.testimonials.cta-eyebrow">
              {f["pink.testimonials.cta-eyebrow"] ?? ""}
            </PinkEyebrow>
            <h2
              className="pink-display max-w-[24ch]"
              style={{
                fontSize: "clamp(26px, 2.8vw, 38px)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
              {...fieldAttr("pink.testimonials.cta-heading")}
            >
              {f["pink.testimonials.cta-heading"] ?? ""}
            </h2>
            <p
              className="max-w-[46ch] text-[16px] leading-[1.7]"
              style={{ color: "var(--pink-body)" }}
              {...fieldAttr("pink.testimonials.cta-body")}
            >
              {f["pink.testimonials.cta-body"] ?? ""}
            </p>
            {f["pink.testimonials.cta-button-label"] && (
              <Link
                href={f["pink.testimonials.cta-button-link"] ?? "/testimonials/submit"}
                className="pink-btn pink-btn-solid mt-2"
                {...fieldAttr("pink.testimonials.cta-button-label")}
              >
                {f["pink.testimonials.cta-button-label"]}
              </Link>
            )}
          </PinkReveal>
        </section>
      )}
    </>
  );
}
