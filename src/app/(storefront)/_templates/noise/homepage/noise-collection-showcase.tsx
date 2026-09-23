import Link from "next/link";

import type { NoiseCollectionCardData } from "../shared/noise-collection-card";
import { fieldAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { NoiseCollectionCard } from "../shared/noise-collection-card";

type NoiseCollectionShowcaseProps = {
  overline?: string;
  title: string;
  description?: string;
  ctaText: string;
  ctaHref: string;
  /** Already filtered (non-empty) and sliced to the owner's count by the caller. */
  collections: (NoiseCollectionCardData & { id: string })[];
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

/**
 * Homepage collections showcase (homepage.collections) — same header as the
 * product rail, then a centered wrap row of collection cards. Fixed
 * per-breakpoint widths (1 / 2 / 3 across) mean two cards read as a
 * deliberate pair rather than a half-empty grid.
 */
export function NoiseCollectionShowcase({
  overline,
  title,
  description,
  ctaText,
  ctaHref,
  collections,
  sectionAttrs,
}: NoiseCollectionShowcaseProps) {
  if (collections.length === 0) return null;

  return (
    <section
      className="border-foreground/15 px-7 py-16"
      style={{ background: "var(--vn-paper)" }}
      {...sectionAttrs}
    >
      <div className="mx-auto max-w-[1440px]">
        {/* Header — mirrors NoiseProductRail */}
        <FadeIn className="border-foreground/20 mb-12 flex flex-col items-center justify-center space-y-4 pb-7">
          {overline && (
            <p
              className="font-mono text-[10px] tracking-[.22em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
              {...fieldAttr("noise.homepage.rail-one-overline")}
            >
              {overline}
            </p>
          )}
          <h2
            className="font-serif leading-tight tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
            {...fieldAttr("noise.homepage-featured-title")}
          >
            {title}
          </h2>
          {description && (
            <p
              className="max-w-md text-center text-sm opacity-60"
              {...fieldAttr("noise.homepage-featured-description")}
            >
              {description}
            </p>
          )}
          <Link
            href={ctaHref}
            className="flex shrink-0 items-center gap-3 px-3.5 py-2 font-mono text-[10px] tracking-[.22em] uppercase transition-opacity hover:opacity-60"
            style={{
              border: "1px solid var(--vn-ink)",
              color: "var(--vn-ink)",
            }}
          >
            <span {...fieldAttr("noise.homepage-featured-button-text")}>
              {ctaText}
            </span>{" "}
            →
          </Link>
        </FadeIn>

        {/* Centered wrap row — widths subtract the gap share (gap-5 = 20px) */}
        <StaggerContainer
          className="flex flex-wrap justify-center gap-5"
          staggerDelay={0.07}
        >
          {collections.map((collection, index) => (
            <StaggerItem
              key={collection.id}
              className="w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
            >
              <NoiseCollectionCard
                collection={collection}
                index={index}
                aspect="4/5"
                showNumber
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-full"
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
