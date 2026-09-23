import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseCollectionCard } from "../shared/noise-collection-card";

export function NoiseCollectionsPage({
  collections,
  business,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "noise.collections.overline",
    "noise.collections.heading",
    "noise.collections.cta-text",
    "noise.collections.empty-text",
  ]);

  const overline = f["noise.collections.overline"] ?? "Browse";
  const heading = f["noise.collections.heading"] ?? "All Collections";
  const ctaText = f["noise.collections.cta-text"] ?? "View all products →";
  const emptyText =
    f["noise.collections.empty-text"] ?? "No collections available at this time.";

  return (
    <PageTransition>
      {/* ── Centered header ── */}
      <section
        className="px-6 pt-16 pb-14 text-center"
        style={{
          background: "var(--vn-paper)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
        {...sectionGroupAttr("collections", "listing")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
            {...fieldAttr("noise.collections.overline")}
          >
            {overline}
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
            {...fieldAttr("noise.collections.heading")}
          >
            {heading}
          </h1>
          <Link
            href="/shop"
            className="mt-5 inline-flex flex-shrink-0 font-mono text-[10.5px] tracking-[0.22em] whitespace-nowrap uppercase transition-opacity hover:opacity-70"
            style={{
              borderBottom: "1px solid var(--vn-ink)",
              paddingBottom: "4px",
              color: "var(--vn-ink)",
            }}
            {...fieldAttr("noise.collections.cta-text")}
          >
            {ctaText}
          </Link>
        </FadeIn>
      </section>

      {list.length === 0 ? (
        <FadeIn
          className="px-7 py-24 text-center"
          style={{ background: "var(--vn-paper)" }}
        >
          <p
            className="font-serif text-2xl italic"
            style={{ color: "var(--vn-steel-mist)" }}
            {...fieldAttr("noise.collections.empty-text")}
          >
            {emptyText}
          </p>
        </FadeIn>
      ) : (
        <section className="px-7 pt-14 pb-16">
          <div className="mx-auto max-w-[1440px]">
            {/* Collection cards */}
            <StaggerContainer
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              staggerDelay={0.05}
            >
              {list.map((collection, i) => (
                <StaggerItem key={collection.id}>
                  <NoiseCollectionCard collection={collection} index={i} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
