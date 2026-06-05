import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseProductCard } from "../shared/sledge-product-card";

type Testimonial = Awaited<ReturnType<typeof api.testimonial.list>>[number];

function formatAttribution(t: Testimonial): string {
  const name = t.customerName.trim();
  const location = (t.customerTitle ?? t.customerCompany ?? "").trim();
  if (name && location) return `${name}, ${location}`;
  return name || location;
}

export async function SledgeTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const [testimonials, homepage] = await Promise.all([
    api.testimonial.list({ publicOnly: true }),
    api.business.getHomepage(),
  ]);

  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;

  const f = resolveFields(customFields, [
    "sledge.testimonials.page-heading",
    "sledge.testimonials.page-intro",
    "sledge.testimonials.trending-heading",
    "sledge.testimonials.empty-state-text",
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
  ]);

  const heading = f["sledge.testimonials.page-heading"] ?? "Testimonials";
  const pageIntro =
    f["sledge.testimonials.page-intro"] ??
    "Check out what our customers have been saying about us!";
  const trendingHeading =
    f["sledge.testimonials.trending-heading"] ?? "Trending Now";
  const emptyStateText =
    f["sledge.testimonials.empty-state-text"] ??
    "No testimonials yet. Check back soon.";
  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "Browse Shop";
  const shopCtaHref = f["sledge.global.shop-cta-link"] ?? "/shop";

  const products = homepage?.products ?? [];

  return (
    <PageTransition>
      {/* ── Page header ── */}
      <section
        className="px-7 pt-16 pb-10 md:pt-20 md:pb-14"
        style={{ background: "#ffffff" }}
        {...sectionGroupAttr("testimonials", "header")}
      >
        <FadeIn style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <h1
            className="uppercase"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              color: "var(--sl-coral)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            {heading}
          </h1>
          <p
            className="mt-4 font-sans text-sm leading-relaxed md:text-base"
            style={{ color: "var(--sl-ink-soft)", maxWidth: "52ch" }}
          >
            {pageIntro}
          </p>
        </FadeIn>
      </section>

      {/* ── Testimonial cards ── */}
      <section
        className="px-7 pb-16 md:pb-20"
        style={{ background: "#ffffff" }}
        {...sectionGroupAttr("testimonials", "list")}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          {testimonials.length === 0 ? (
            <FadeIn className="py-16 text-center">
              <p
                className="font-sans text-base"
                style={{ color: "var(--sl-ink-soft)" }}
              >
                {emptyStateText}
              </p>
              <Link
                href="/"
                className="mt-6 inline-block font-sans text-xs tracking-[0.2em] uppercase transition-opacity hover:opacity-60"
                style={{ color: "var(--sl-ink)" }}
              >
                Back to home
              </Link>
            </FadeIn>
          ) : (
            <div className="flex flex-col gap-8 md:gap-10">
              {testimonials.map((t, i) => (
                <TestimonialCard key={t.id} t={t} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Trending Now product rail ── */}
      {products.length > 0 && (
        <section
          className="px-7 py-16"
          style={{ background: "var(--vn-paper)" }}
          {...sectionGroupAttr("testimonials", "products")}
        >
          <div style={{ maxWidth: "1440px", margin: "0 auto" }}>
            <FadeIn className="mb-12 flex items-center justify-between">
              <h2
                className="uppercase"
                style={{
                  fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
                  color: "var(--sl-coral)",
                  letterSpacing: "0.04em",
                  lineHeight: 1,
                }}
              >
                {trendingHeading}
              </h2>
              <Link
                href={shopCtaHref}
                className="flex shrink-0 items-center gap-2 px-4 py-2 font-sans text-xs tracking-[.2em] uppercase transition-opacity hover:opacity-60"
                style={{
                  border: "1px solid var(--sl-ink)",
                  color: "var(--sl-ink)",
                }}
              >
                {shopCtaText} →
              </Link>
            </FadeIn>

            <StaggerContainer
              className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4"
              staggerDelay={0.07}
            >
              {products.slice(0, 4).map((product, index) => (
                <StaggerItem key={product.id}>
                  <NoiseProductCard
                    product={product as unknown as Product}
                    index={index}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}

function TestimonialCard({ t, index }: { t: Testimonial; index: number }) {
  const isRight = index % 2 === 1;
  const label = t.title?.trim();
  const attribution = formatAttribution(t);
  const quote = t.text.trim();

  return (
    <FadeIn
      style={{
        maxWidth: "820px",
        marginLeft: isRight ? "auto" : undefined,
        marginRight: isRight ? undefined : "auto",
      }}
    >
      <div
        className="rounded-sm px-6 py-8 md:px-10 md:py-10"
        style={{
          border: "1px solid #d8d8d8",
          background: "#ffffff",
          textAlign: isRight ? "right" : "left",
        }}
      >
        {label && (
          <p
            className="mb-5 font-sans text-xs tracking-[0.22em] uppercase italic"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {label}
          </p>
        )}

        <blockquote
          className="font-sans text-sm leading-[1.85] tracking-[0.06em] uppercase md:text-base"
          style={{ color: "var(--sl-ink)" }}
        >
          &ldquo;{quote}&rdquo;
        </blockquote>

        {attribution && (
          <p
            className="mt-6 font-sans text-xs tracking-[0.18em] uppercase md:text-sm"
            style={{ color: "var(--sl-ink)" }}
          >
            {attribution}
          </p>
        )}
      </div>
    </FadeIn>
  );
}
