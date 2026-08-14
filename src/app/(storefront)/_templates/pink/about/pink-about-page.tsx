import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { PinkFactRow } from "../shared/pink-fact-rows";
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
import { PinkFactRows } from "../shared/pink-fact-rows";
import { PinkPortraitHeader } from "../shared/pink-portrait-header";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkRule } from "../shared/pink-rule";

const FIELD_KEYS = [
  "pink.about.hero-image",
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
  "pink.about.timeline-heading",
  "pink.about.timeline-note",
  "pink.about.commissions-heading",
  "pink.about.commissions-body",
  "pink.about.commissions-cta-label",
  "pink.about.commissions-cta-link",
  "pink.about.commissions-secondary-label",
  "pink.about.commissions-secondary-link",
];

type ValueItem = { title?: string; body?: string; _id?: string };
type TimelineItem = {
  year?: string;
  title?: string;
  body?: string;
  _id?: string;
};
type GalleryItem = {
  image?: string;
  colSpan?: string;
  rowSpan?: string;
  _id?: string;
};

const DEFAULT_VALUES: ValueItem[] = [
  {
    title: "One of a kind",
    body: "Made one at a time, never in runs. No two pieces are exactly alike.",
  },
  {
    title: "Priced plainly",
    body: "The price on the tag is the price. No markups dressed up as scarcity.",
  },
  {
    title: "Natural materials",
    body: "100% wool filling, cotton fabrics, polymer clay faces.",
  },
  {
    title: "Made by hand",
    body: "Every piece passes through Evelyn's hands start to finish.",
  },
];

// Deliberately empty (2026-07-31, client direction): the shipped defaults
// asserted dates — 2004 / 2012 / 2018 — that nobody has verified. The section
// self-hides on an empty list (see the `timeline.length > 0` guard below) so a
// fresh store shows nothing here until the owner fills it in.
const DEFAULT_TIMELINE: TimelineItem[] = [];

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

// Deliberately empty (2026-07-31, client direction): turnaround, starting
// price and deposit terms were all invented. `PinkFactRows` returns `null` on
// an empty list, so the band drops to a single copy column until the owner
// adds rows of her own.
const DEFAULT_COMMISSION_FACTS: PinkFactRow[] = [];

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
      ? commissionFactsRaw.map((r) => ({
          label: r.label ?? "",
          value: r.value ?? "",
          _id: r._id,
        }))
      : DEFAULT_COMMISSION_FACTS;

  const hasCommissionCta =
    Boolean(f["pink.about.commissions-cta-label"]) ||
    Boolean(f["pink.about.commissions-secondary-label"]);

  return (
    <>
      {/* ── about.hero ─────────────────────────────────────────────────── */}
      {/* Pale wash + a 4:5 portrait as of 2026-07-31 (client direction). This
          was a 66vh `PinkPhotoHeader`, i.e. the third dark band on a page that
          also had two more below it — and because `pink.about.hero-image` had
          no default, a fresh store opened About on an empty near-black slab.
          `PinkPortraitHeader` drops the image column entirely when no portrait
          is set, so the unset state is a clean band rather than a void. */}
      <PinkPortraitHeader
        imageUrl={f["pink.about.hero-image"]}
        imageAlt=""
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
        heading={f["pink.about.hero-heading"] ?? ""}
        headingFieldKey="pink.about.hero-heading"
        intro={f["pink.about.hero-intro"] ?? ""}
        introFieldKey="pink.about.hero-intro"
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
                fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
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
                  src={
                    f["pink.about.story-signature-image"] ?? "/placeholder.svg"
                  }
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
        <section
          aria-label="What doesn't change"
          // Lightened from `PinkDarkBand` on 2026-07-31 (client direction):
          // black is used selectively — the homepage events band and the
          // footer — and About was carrying three dark bands. The pale wash
          // still reads as a distinct band without another black slab.
          // EVERY descendant colour moved to the light ramp with it: the
          // `--pink-ink-*` family and `--pink-blush` are dark-surface tokens
          // and land at 1.2:1–3.1:1 here. Padding matches `PinkDarkBand` so
          // the rhythm against the commissions band (still dark) holds.
          className="px-5 py-[76px] md:px-10 md:py-[88px]"
          style={{ background: "var(--pink-panel)", color: "var(--pink-ink)" }}
          {...sectionGroupAttr("about", "values")}
        >
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <h2
                className="pink-display max-w-[20ch]"
                style={{
                  fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                  color: "var(--pink-ink)",
                }}
                {...fieldAttr("pink.about.values-heading")}
              >
                {f["pink.about.values-heading"] ?? ""}
              </h2>
              <p
                className="max-w-[40ch] text-[0.9375rem] leading-[1.7]"
                style={{ color: "var(--pink-muted)" }}
                {...fieldAttr("pink.about.values-note")}
              >
                {f["pink.about.values-note"] ?? ""}
              </p>
            </div>

            {/* Deliberately not `PinkHairlineGrid`: its paper tone paints the
                container `--pink-paper`, which would cut a white rectangle out
                of the wash. Since the 1px cell rings were removed on
                2026-07-31 that tone is now just `display:grid; gap:32px`, so a
                plain grid is visually identical — and the cells drop their
                padding here so column one lines up with the heading above
                instead of floating 24px inside the band. */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v, i) => (
                <PinkReveal
                  key={v._id ?? i}
                  index={i}
                  className="flex min-w-0 flex-col gap-3"
                >
                  <PinkRule width={34} />
                  <h3
                    className="pink-display text-[1.1875rem]"
                    style={{ fontWeight: 600, color: "var(--pink-ink)" }}
                  >
                    {v.title ?? ""}
                  </h3>
                  <p
                    className="text-[0.9375rem] leading-[1.7]"
                    style={{ color: "var(--pink-body)" }}
                  >
                    {v.body ?? ""}
                  </p>
                </PinkReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── about.timeline ─────────────────────────────────────────────── */}
      {/* `timeline.length > 0` matches the gallery guard below: with no rows
          the band would render a heading and note over nothing at all. */}
      {isSectionVisible(customFields, "pink", "about.timeline") &&
        timeline.length > 0 && (
          <section
            className="px-5 py-16 md:px-10 md:py-24"
            {...sectionGroupAttr("about", "timeline")}
          >
            <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-[0.72fr_1fr]">
              <PinkReveal className="flex flex-col gap-4">
                <h2
                  className="pink-display max-w-[16ch]"
                  style={{
                    fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
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
                      <h3 className="pink-display text-[17px] font-semibold">
                        {row.title ?? ""}
                      </h3>
                      <p
                        className="text-[15px] leading-[1.7]"
                        style={{ color: "var(--pink-muted)" }}
                      >
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
          ariaLabel="Custom orders"
          sectionAttrs={sectionGroupAttr("about", "commissions")}
        >
          <div className="grid gap-10 md:grid-cols-[1fr_0.9fr] md:items-center">
            <PinkReveal className="flex flex-col gap-4">
              <h2
                className="pink-display max-w-[22ch]"
                style={{
                  fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)",
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
                      href={
                        f["pink.about.commissions-secondary-link"] ?? "/shop"
                      }
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
