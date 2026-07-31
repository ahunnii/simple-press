"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import type { RouterOutputs } from "~/trpc/react";

import { PinkEmptyState } from "../shared/pink-empty-state";
import type { PinkFilterChipItem } from "../shared/pink-filter-chips";
import { PinkFilterChips } from "../shared/pink-filter-chips";
import { PinkImageFallback } from "../shared/pink-image-fallback";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

type Props = {
  testimonials: Testimonial[];
  headingSuffix: string;
  allLabel: string;
  keeperLabel: string;
  studioLabel: string;
  emptyHeading: string;
  emptyBody: string;
};

const CATEGORY_KEEPER = "keeper";
const CATEGORY_STUDIO = "studio";

function categoryOf(t: Testimonial): typeof CATEGORY_KEEPER | typeof CATEGORY_STUDIO {
  return t.source === "owner" ? CATEGORY_STUDIO : CATEGORY_KEEPER;
}

/**
 * Best-effort singular form of an owner-set plural suffix (e.g. "notes back"
 * → "note back") for the count === 1 case (review 2026-07-29, P6). The field
 * is free text, so this is a naive trailing-`s` strip rather than real
 * grammar — safe for the shipped default and for any similarly-shaped
 * owner-authored suffix ("reviews" → "review", "pieces" → "piece"); a suffix
 * that doesn't end in a plain "s" (no change) is the graceful fallback.
 */
function singularize(suffix: string): string {
  const [firstWord, ...rest] = suffix.trim().split(" ");
  if (!firstWord || !firstWord.endsWith("s") || firstWord.endsWith("ss")) {
    return suffix;
  }
  return [firstWord.slice(0, -1), ...rest].join(" ");
}

/**
 * `testimonials.grid` — CSS `columns: 3` masonry, collapsing to 2 then 1.
 * The `Testimonial` model has no `category` column, so the filter chips are
 * derived from `source` ("customer" → "From customers", "owner" → "From the
 * studio") rather than an owner-authored taxonomy — see build report.
 */
export function PinkTestimonialsGrid({
  testimonials,
  headingSuffix,
  allLabel,
  keeperLabel,
  studioLabel,
  emptyHeading,
  emptyBody,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const hasStudioNotes = testimonials.some((t) => categoryOf(t) === CATEGORY_STUDIO);

  const filters: PinkFilterChipItem[] = [
    { id: "all", label: allLabel },
    { id: CATEGORY_KEEPER, label: keeperLabel },
    ...(hasStudioNotes ? [{ id: CATEGORY_STUDIO, label: studioLabel }] : []),
  ];

  const filtered = useMemo(
    () =>
      activeFilter === "all"
        ? testimonials
        : testimonials.filter((t) => categoryOf(t) === activeFilter),
    [testimonials, activeFilter],
  );

  return (
    <section
      className="px-5 py-16 md:px-10 md:py-24"
      {...sectionGroupAttr("testimonials", "grid")}
    >
      <div className="mx-auto max-w-[1400px]">
        {testimonials.length > 0 && (
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2
              className="pink-display"
              style={{ fontSize: "clamp(1.625rem, 2.8vw, 2.375rem)", fontWeight: 600, letterSpacing: "-0.025em" }}
            >
              {testimonials.length}{" "}
              {testimonials.length === 1 ? singularize(headingSuffix) : headingSuffix}
            </h2>
            <PinkFilterChips
              items={filters}
              activeId={activeFilter}
              onSelect={setActiveFilter}
              aria-label="Filter notes"
            />
          </div>
        )}

        {testimonials.length === 0 ? (
          <PinkEmptyState heading={emptyHeading} body={emptyBody} />
        ) : (
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
            {filtered.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialCard({ t }: { t: Testimonial }) {
  const category = categoryOf(t);
  const avatar = t.photoUrls[0];

  return (
    <div
      className="mb-6 flex flex-col gap-4 p-6 transition-colors"
      style={{
        breakInside: "avoid",
        background: "var(--pink-white)",
        border: "1px solid var(--pink-line)",
      }}
    >
      <span
        className="pink-eyebrow"
        style={{ fontSize: "12px" }}
      >
        {category === CATEGORY_STUDIO ? "From the studio" : "From a customer"}
      </span>
      {t.title && (
        <p className="pink-display text-[16px] font-semibold">{t.title}</p>
      )}
      <p className="text-[16px] leading-[1.75]" style={{ color: "var(--pink-body)" }}>
        {t.text}
      </p>
      <div
        className="flex items-center gap-3 pt-3"
        style={{ borderTop: "1px solid var(--pink-line-soft)" }}
      >
        <div className="relative h-[42px] w-[42px] shrink-0 overflow-hidden">
          {avatar ? (
            <Image src={avatar} alt="" fill className="object-cover" sizes="42px" />
          ) : (
            <PinkImageFallback surface="paper" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium" style={{ color: "var(--pink-ink)" }}>
            {t.customerName}
          </span>
          {(t.customerTitle ?? t.customerCompany) && (
            <span className="text-[12px]" style={{ color: "var(--pink-subtle)" }}>
              {t.customerTitle ?? t.customerCompany}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
