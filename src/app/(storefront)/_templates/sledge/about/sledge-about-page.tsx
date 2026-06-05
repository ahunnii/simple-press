import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { NoiseProductCard } from "../shared/sledge-product-card";

export async function SledgeAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "sledge.about-hero-heading",
    "sledge.about-hero-image",
    "sledge.about.section-1-label",
    "sledge.about.section-1-body",
    "sledge.about.section-2-label",
    "sledge.about.section-2-body",
    "sledge.about.section-3-label",
    "sledge.about.section-3-body",
    "sledge.global.shop-cta-text",
    "sledge.global.shop-cta-link",
  ]);

  const homepage = await api.business.getHomepage();
  const products = homepage?.products ?? [];

  const heroImage = f["sledge.about-hero-image"] ?? "";
  const heading = f["sledge.about-hero-heading"] ?? "About The Artist";
  const shopCtaText = f["sledge.global.shop-cta-text"] ?? "Browse Shop";
  const shopCtaHref = f["sledge.global.shop-cta-link"] ?? "/shop";

  const sections = [
    {
      label: f["sledge.about.section-1-label"] ?? "My Story.",
      body: f["sledge.about.section-1-body"] ?? "",
    },
    {
      label: f["sledge.about.section-2-label"] ?? "What I Do.",
      body: f["sledge.about.section-2-body"] ?? "",
    },
    {
      label: f["sledge.about.section-3-label"] ?? "My Services.",
      body: f["sledge.about.section-3-body"] ?? "",
    },
  ];

  return (
    <>
      {/* ── Hero: cream left / editorial image right ── */}
      <section
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ minHeight: "360px" }}
        {...sectionGroupAttr("about", "hero")}
      >
        <div
          className="hidden md:block"
          style={{ background: "var(--sl-cream)", minHeight: "360px" }}
        />
        {heroImage ? (
          <div className="relative" style={{ minHeight: "360px" }}>
            <Image
              src={heroImage}
              alt={heading}
              fill
              className="object-cover object-top"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        ) : (
          <div style={{ background: "var(--sl-green)", minHeight: "360px" }} />
        )}
      </section>

      {/* ── Heading + three labeled content rows ── */}
      <section
        className="px-7 py-16"
        style={{ background: "#ffffff" }}
        {...sectionGroupAttr("about", "main")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1100px" }}>
          <h1
            className="mb-14 uppercase"
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              color: "var(--sl-coral)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            {heading}
          </h1>

          {/*
           * 3-column grid: label | 3px red divider | content
           * The divider div spans all 3 content rows so the red line is
           * continuous even across rowGap space.
           */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(90px, 160px) 3px 1fr",
              rowGap: "2.5rem",
            }}
          >
            <div
              style={{
                gridColumn: 2,
                gridRow: `1 / ${sections.length + 1}`,
                background: "var(--sl-red)",
              }}
            />

            {sections.map((section, i) => (
              <Fragment key={i}>
                <div
                  style={{
                    gridColumn: 1,
                    gridRow: i + 1,
                    paddingRight: "1.5rem",
                    alignSelf: "start",
                  }}
                >
                  <span
                    className="italic"
                    style={{
                      fontSize: "clamp(14px, 1.8vw, 16px)",
                      color: "var(--sl-ink)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {section.label}
                  </span>
                </div>
                <div
                  style={{
                    gridColumn: 3,
                    gridRow: i + 1,
                    paddingLeft: "2rem",
                  }}
                >
                  {section.body && (
                    <p
                      className="italic"
                      style={{
                        fontSize: "clamp(14px, 1.8vw, 16px)",
                        color: "var(--sl-ink)",
                        lineHeight: 1.85,
                      }}
                    >
                      {section.body}
                    </p>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── Trending Now product rail ── */}
      {products.length > 0 && (
        <section
          className="px-7 py-16"
          style={{ background: "var(--vn-paper)" }}
          {...sectionGroupAttr("about", "products")}
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
                Trending Now
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
    </>
  );
}
