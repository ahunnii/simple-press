import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getRichTextFieldValue,
  isContentEmpty,
  parseTemplateListRows,
} from "~/lib/template-fields";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { PinkDarkBand } from "../shared/pink-dark-band";
import { PinkEyebrow } from "../shared/pink-eyebrow";
import type { PinkFactRow } from "../shared/pink-fact-rows";
import { PinkFactRows } from "../shared/pink-fact-rows";
import { PinkHairlineGrid } from "../shared/pink-hairline-grid";
import { PinkPhotoHeader } from "../shared/pink-photo-header";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkRule } from "../shared/pink-rule";

const FIELD_KEYS = [
  "pink.about.hero-image",
  "pink.about.hero-eyebrow",
  "pink.about.hero-heading",
  "pink.about.hero-intro",
  "pink.about.story-heading",
  "pink.about.story-paragraph-1",
  "pink.about.story-paragraph-2",
  "pink.about.story-paragraph-3",
  "pink.about.story-signature-image",
  "pink.about.story-signature-name",
  "pink.about.story-signature-role",
  "pink.about.story-image-main",
  "pink.about.story-image-2",
  "pink.about.story-image-3",
  "pink.about.values-heading",
  "pink.about.values-note",
  "pink.about.timeline-eyebrow",
  "pink.about.timeline-heading",
  "pink.about.timeline-note",
  "pink.about.commissions-eyebrow",
  "pink.about.commissions-heading",
  "pink.about.commissions-body",
  "pink.about.commissions-cta-label",
  "pink.about.commissions-cta-link",
  "pink.about.commissions-secondary-label",
  "pink.about.commissions-secondary-link",
];

type ValueItem = { title?: string; body?: string; _id?: string };
type TimelineItem = { year?: string; title?: string; body?: string; _id?: string };
type GalleryItem = { image?: string; colSpan?: string; rowSpan?: string; _id?: string };

const DEFAULT_VALUES: ValueItem[] = [
  { title: "Made by hand", body: "No molds, no printing. Every piece passes through Evelyn's hands start to finish." },
  { title: "Priced plainly", body: "The price on the tag is the price. No markups dressed up as scarcity." },
  { title: "Repairs are free", body: "If a seam gives out, bring it back. We'll fix what we made, always." },
  { title: "Nobody turned away", body: "Payment plans and trades are on the table — just ask before you walk." },
];

const DEFAULT_TIMELINE: TimelineItem[] = [
  { year: "2004", title: "First stitches", body: "Evelyn starts sewing dolls at her kitchen table, mostly for family." },
  { year: "2012", title: "First market table", body: "PinkArt's first pieces go out at a Detroit maker's market." },
  { year: "2018", title: "The studio opens", body: "A dedicated workshop space, and the first make & takes begin." },
  { year: "Today", title: "Still one at a time", body: "Same process, same table, a few more hands helping on busy weeks." },
];

// Empty `image` on purpose: six placeholder slabs read as a broken photo grid
// on a fresh store. The section collapses entirely until the owner adds at
// least one real image (same rule as the homepage events mosaic).
const DEFAULT_GALLERY: GalleryItem[] = [
  { image: "", colSpan: "2", rowSpan: "2" },
  { image: "", colSpan: "1", rowSpan: "1" },
  { image: "", colSpan: "1", rowSpan: "1" },
  { image: "", colSpan: "1", rowSpan: "2" },
  { image: "", colSpan: "1", rowSpan: "1" },
  { image: "", colSpan: "1", rowSpan: "1" },
];

const DEFAULT_COMMISSION_FACTS: PinkFactRow[] = [
  { label: "Turnaround", value: "3–6 weeks" },
  { label: "Starting at", value: "$185" },
  { label: "Deposit", value: "Half up front" },
];

function clampSpan(raw: string | undefined, max = 2): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
}

export function PinkAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, FIELD_KEYS);

  const storyRichContent = getRichTextFieldValue(
    customFields as unknown,
    "pink.about.story-body",
  );
  const hasStoryRichText = !isContentEmpty(storyRichContent as TiptapJSON);

  const valuesRaw = parseTemplateListRows(
    (customFields as Record<string, unknown> | undefined)?.[
      "pink.about.values-items"
    ],
  ) as ValueItem[];
  const values = valuesRaw.length > 0 ? valuesRaw : DEFAULT_VALUES;

  const timelineRaw = parseTemplateListRows(
    (customFields as Record<string, unknown> | undefined)?.[
      "pink.about.timeline-items"
    ],
  ) as TimelineItem[];
  const timeline = timelineRaw.length > 0 ? timelineRaw : DEFAULT_TIMELINE;

  const galleryRaw = parseTemplateListRows(
    (customFields as Record<string, unknown> | undefined)?.[
      "pink.about.gallery-items"
    ],
  ) as GalleryItem[];
  const gallery = galleryRaw.length > 0 ? galleryRaw : DEFAULT_GALLERY;

  const commissionFactsRaw = parseTemplateListRows(
    (customFields as Record<string, unknown> | undefined)?.[
      "pink.about.commissions-facts"
    ],
  ) as PinkFactRow[];
  const commissionFacts: PinkFactRow[] =
    commissionFactsRaw.length > 0
      ? commissionFactsRaw.map((r) => ({ label: r.label ?? "", value: r.value ?? "", _id: r._id }))
      : DEFAULT_COMMISSION_FACTS;

  const hasCommissionCta =
    Boolean(f["pink.about.commissions-cta-label"]) ||
    Boolean(f["pink.about.commissions-secondary-label"]);

  return (
    <>
      {/* ── about.hero ─────────────────────────────────────────────────── */}
      <PinkPhotoHeader
        imageUrl={f["pink.about.hero-image"] ?? ""}
        imageAlt=""
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
        eyebrow={f["pink.about.hero-eyebrow"] ?? ""}
        eyebrowFieldKey="pink.about.hero-eyebrow"
        heading={f["pink.about.hero-heading"] ?? ""}
        headingFieldKey="pink.about.hero-heading"
        intro={f["pink.about.hero-intro"] ?? ""}
        introFieldKey="pink.about.hero-intro"
        minHeight="66vh"
        sectionAttrs={sectionGroupAttr("about", "hero")}
      />

      {/* ── about.story ────────────────────────────────────────────────── */}
      <section
        className="px-5 py-16 md:px-10 md:py-24"
        {...sectionGroupAttr("about", "story")}
      >
        <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-[1fr_0.85fr] md:items-start">
          <PinkReveal className="flex max-w-[60ch] flex-col gap-5">
            <h2
              className="pink-display max-w-[24ch]"
              style={{
                fontSize: "clamp(26px, 2.8vw, 38px)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
              }}
              {...fieldAttr("pink.about.story-heading")}
            >
              {f["pink.about.story-heading"] ?? ""}
            </h2>

            {hasStoryRichText ? (
              <TiptapRenderer
                content={storyRichContent as TiptapJSON}
                className="pink-prose max-w-none"
              />
            ) : (
              <div className="flex flex-col gap-4">
                <p
                  className="text-[17px] leading-[1.8]"
                  style={{ color: "var(--pink-body)" }}
                  {...fieldAttr("pink.about.story-paragraph-1")}
                >
                  {f["pink.about.story-paragraph-1"] ?? ""}
                </p>
                <p
                  className="text-[17px] leading-[1.8]"
                  style={{ color: "var(--pink-body)" }}
                  {...fieldAttr("pink.about.story-paragraph-2")}
                >
                  {f["pink.about.story-paragraph-2"] ?? ""}
                </p>
                <p
                  className="text-[17px] leading-[1.8]"
                  style={{ color: "var(--pink-body)" }}
                  {...fieldAttr("pink.about.story-paragraph-3")}
                >
                  {f["pink.about.story-paragraph-3"] ?? ""}
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <div
                className="relative h-14 w-14 shrink-0 overflow-hidden"
                style={{ background: "var(--pink-panel)" }}
              >
                <Image
                  src={f["pink.about.story-signature-image"] ?? "/placeholder.svg"}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <div className="flex flex-col">
                <span
                  className="pink-display text-[15px] font-semibold"
                  {...fieldAttr("pink.about.story-signature-name")}
                >
                  {f["pink.about.story-signature-name"] ?? ""}
                </span>
                <span
                  className="text-[13px]"
                  style={{ color: "var(--pink-subtle)" }}
                  {...fieldAttr("pink.about.story-signature-role")}
                >
                  {f["pink.about.story-signature-role"] ?? ""}
                </span>
              </div>
            </div>
          </PinkReveal>

          <PinkReveal index={1} className="grid grid-cols-2 gap-3">
            <div
              className="relative col-span-2 overflow-hidden"
              style={{ aspectRatio: "3 / 2", background: "var(--pink-panel)" }}
            >
              <Image
                src={f["pink.about.story-image-main"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
            </div>
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: "1 / 1", background: "var(--pink-panel)" }}
            >
              <Image
                src={f["pink.about.story-image-2"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 22vw"
              />
            </div>
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: "1 / 1", background: "var(--pink-panel)" }}
            >
              <Image
                src={f["pink.about.story-image-3"] ?? "/placeholder.svg"}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 22vw"
              />
            </div>
          </PinkReveal>
        </div>
      </section>

      {/* ── about.values ───────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "about.values") && (
        <PinkDarkBand
          ariaLabel="What doesn't change"
          sectionAttrs={sectionGroupAttr("about", "values")}
        >
          <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <h2
              className="pink-display max-w-[20ch]"
              style={{
                fontSize: "clamp(26px, 2.8vw, 38px)",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "var(--pink-paper)",
              }}
              {...fieldAttr("pink.about.values-heading")}
            >
              {f["pink.about.values-heading"] ?? ""}
            </h2>
            <p
              className="max-w-[40ch] text-[15px] leading-[1.7]"
              style={{ color: "var(--pink-ink-muted)" }}
              {...fieldAttr("pink.about.values-note")}
            >
              {f["pink.about.values-note"] ?? ""}
            </p>
          </div>

          <PinkHairlineGrid tone="dark" columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <PinkReveal key={v._id ?? i} index={i} className="flex flex-col gap-3 p-6">
                <PinkRule tone="dark" width={34} />
                <h3
                  className="pink-display"
                  style={{ fontSize: "19px", fontWeight: 600, color: "var(--pink-paper)" }}
                >
                  {v.title ?? ""}
                </h3>
                <p
                  className="text-[15px] leading-[1.7]"
                  style={{ color: "var(--pink-ink-muted)" }}
                >
                  {v.body ?? ""}
                </p>
              </PinkReveal>
            ))}
          </PinkHairlineGrid>
        </PinkDarkBand>
      )}

      {/* ── about.timeline ─────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "about.timeline") && (
        <section
          className="px-5 py-16 md:px-10 md:py-24"
          {...sectionGroupAttr("about", "timeline")}
        >
          <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-[0.72fr_1fr]">
            <PinkReveal className="flex flex-col gap-4">
              <PinkEyebrow tone="paper" fieldKey="pink.about.timeline-eyebrow">
                {f["pink.about.timeline-eyebrow"] ?? ""}
              </PinkEyebrow>
              <h2
                className="pink-display max-w-[16ch]"
                style={{
                  fontSize: "clamp(26px, 2.8vw, 38px)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.1,
                }}
                {...fieldAttr("pink.about.timeline-heading")}
              >
                {f["pink.about.timeline-heading"] ?? ""}
              </h2>
              <p
                className="max-w-[38ch] text-[15px] leading-[1.7]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.about.timeline-note")}
              >
                {f["pink.about.timeline-note"] ?? ""}
              </p>
            </PinkReveal>

            <div className="flex flex-col">
              {timeline.map((row, i) => (
                <PinkReveal
                  key={row._id ?? i}
                  index={i}
                  as="div"
                  className="grid grid-cols-[78px_minmax(0,1fr)] gap-4 py-5"
                  style={{ borderTop: "1px solid var(--pink-line)" }}
                >
                  <span
                    className="pink-display text-[15px] font-semibold"
                    style={{ color: "var(--pink-rose)" }}
                  >
                    {row.year ?? ""}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="pink-display text-[17px] font-semibold">{row.title ?? ""}</h3>
                    <p className="text-[15px] leading-[1.7]" style={{ color: "var(--pink-muted)" }}>
                      {row.body ?? ""}
                    </p>
                  </div>
                </PinkReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── about.gallery ──────────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "about.gallery") &&
        gallery.some((item) => item.image) && (
        <section
          className="px-5 py-16 md:px-10 md:py-24"
          aria-label="Studio gallery"
          {...sectionGroupAttr("about", "gallery")}
        >
          <div
            className="mx-auto grid max-w-[1400px] grid-cols-2 gap-[2px] sm:grid-cols-4"
            style={{ gridAutoRows: "168px" }}
          >
            {gallery.map((item, i) => (
              <div
                key={item._id ?? i}
                className="relative overflow-hidden"
                style={{
                  background: "var(--pink-panel)",
                  gridColumn: `span ${clampSpan(item.colSpan)} / span ${clampSpan(item.colSpan)}`,
                  gridRow: `span ${clampSpan(item.rowSpan)} / span ${clampSpan(item.rowSpan)}`,
                }}
              >
                {/* Unset tiles inside an otherwise-filled gallery stay bare on
                    `--pink-panel` rather than showing a placeholder slab. */}
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 25vw"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── about.commissions ──────────────────────────────────────────── */}
      {isSectionVisible(customFields, "pink", "about.commissions") && (
        <PinkDarkBand
          id="commissions"
          ariaLabel="Commissions"
          sectionAttrs={sectionGroupAttr("about", "commissions")}
        >
          <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
            <PinkReveal className="flex flex-col gap-4">
              <PinkEyebrow tone="dark" fieldKey="pink.about.commissions-eyebrow">
                {f["pink.about.commissions-eyebrow"] ?? ""}
              </PinkEyebrow>
              <h2
                className="pink-display max-w-[22ch]"
                style={{
                  fontSize: "clamp(26px, 2.8vw, 38px)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  color: "var(--pink-paper)",
                }}
                {...fieldAttr("pink.about.commissions-heading")}
              >
                {f["pink.about.commissions-heading"] ?? ""}
              </h2>
              <p
                className="max-w-[52ch] text-[16px] leading-[1.7]"
                style={{ color: "var(--pink-ink-body)" }}
                {...fieldAttr("pink.about.commissions-body")}
              >
                {f["pink.about.commissions-body"] ?? ""}
              </p>
              {hasCommissionCta && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {f["pink.about.commissions-cta-label"] && (
                    <Link
                      href={f["pink.about.commissions-cta-link"] ?? "/contact"}
                      className="pink-btn pink-btn-solid"
                      {...fieldAttr("pink.about.commissions-cta-label")}
                    >
                      {f["pink.about.commissions-cta-label"]}
                    </Link>
                  )}
                  {f["pink.about.commissions-secondary-label"] && (
                    <Link
                      href={f["pink.about.commissions-secondary-link"] ?? "/shop"}
                      className="pink-btn pink-btn-ghost"
                      {...fieldAttr("pink.about.commissions-secondary-label")}
                    >
                      {f["pink.about.commissions-secondary-label"]}
                    </Link>
                  )}
                </div>
              )}
            </PinkReveal>

            <PinkReveal index={1}>
              <PinkFactRows rows={commissionFacts} />
            </PinkReveal>
          </div>
        </PinkDarkBand>
      )}
    </>
  );
}
