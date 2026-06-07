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
      {/* ── Hero: full-width banner ── */}
      <section
        className="relative w-full"
        style={{ height: "clamp(320px, 45vw, 520px)" }}
        {...sectionGroupAttr("about", "hero")}
      >
        {heroImage ? (
          <Image
            src={heroImage}
            alt={heading}
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "var(--sl-green)" }}
          />
        )}
      </section>

      {/* ── Heading + three labeled content rows ── */}
      <section
        className="px-7 py-16 md:py-20"
        style={{ background: "#ffffff" }}
        {...sectionGroupAttr("about", "main")}
      >
        <FadeIn className="mx-auto max-w-7xl">
          <h1
            className="font-heading mb-12 font-bold uppercase md:mb-16"
            style={{
              fontSize: "clamp(3.6rem, 8.5vw, 6.2rem)",
              color: "var(--sl-orange)",
              letterSpacing: "0.02em",
              lineHeight: 1.05,
            }}
          >
            {heading}
          </h1>

          {/* Mobile: stacked label + body per section */}
          <div className="flex flex-col gap-12 md:hidden">
            {sections.map((section, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,9.5rem)_2px_1fr] gap-x-5"
              >
                <span
                  className="self-start font-serif font-normal italic"
                  style={{
                    fontSize: "20px",
                    color: "var(--sl-ink)",
                    lineHeight: 1.4,
                  }}
                >
                  {section.label}
                </span>
                <div
                  style={{
                    background: "var(--sl-orange)",
                    alignSelf: "stretch",
                  }}
                />
                {section.body ? (
                  <p
                    className="font-serif font-normal italic"
                    style={{
                      fontSize: "clamp(22px, 5.85vw, 25px)",
                      color: "var(--sl-ink)",
                      lineHeight: 1.85,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {section.body}
                  </p>
                ) : (
                  <div />
                )}
              </div>
            ))}
          </div>

          {/*
           * Desktop: label | orange divider | content
           * The divider spans all rows so the line stays continuous.
           */}
          <div
            className="hidden w-full md:grid"
            style={{
              gridTemplateColumns: "minmax(160px, 28%) 2px 1fr",
              rowGap: "4rem",
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
                    paddingRight: "2rem",
                    alignSelf: "start",
                  }}
                >
                  <span
                    className="font-normal italic"
                    style={{
                      fontSize: "clamp(20px, 2.1vw, 21px)",
                      color: "var(--sl-ink)",
                      lineHeight: 1.4,
                    }}
                  >
                    {section.label}
                  </span>
                </div>
                <div
                  style={{
                    gridColumn: 3,
                    gridRow: i + 1,
                    paddingLeft: "2.5rem",
                  }}
                >
                  {section.body && (
                    <p
                      className="font-normal italic"
                      style={{
                        fontSize: "clamp(23px, 2.6vw, 26px)",
                        color: "var(--sl-ink)",
                        lineHeight: 1.85,
                        // maxWidth: "62ch",
                        whiteSpace: "pre-line",
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
          className="px-7 py-16 md:py-20"
          style={{ background: "#ffffff" }}
          {...sectionGroupAttr("about", "products")}
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="mb-12 flex items-end justify-between gap-6">
              <h2
                className="font-heading font-bold uppercase"
                style={{
                  fontSize: "clamp(2.6rem, 5.85vw, 4.2rem)",
                  color: "var(--sl-orange)",
                  letterSpacing: "0.02em",
                  lineHeight: 1.05,
                }}
              >
                Trending Now
              </h2>
              <Link
                href={shopCtaHref}
                className="flex shrink-0 items-center gap-2 px-4 py-2.5 font-sans text-[14px] font-medium tracking-[.18em] uppercase transition-opacity hover:opacity-70"
                style={{
                  background: "#ececec",
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
