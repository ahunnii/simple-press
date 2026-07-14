import { Fragment } from "react";
import Image from "next/image";

import type { DefaultAboutPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn } from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgeProductRail } from "../shared/sledge-product-rail";

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
      labelKey: "sledge.about.section-1-label",
      body: f["sledge.about.section-1-body"] ?? "",
      bodyKey: "sledge.about.section-1-body",
    },
    {
      label: f["sledge.about.section-2-label"] ?? "What I Do.",
      labelKey: "sledge.about.section-2-label",
      body: f["sledge.about.section-2-body"] ?? "",
      bodyKey: "sledge.about.section-2-body",
    },
    {
      label: f["sledge.about.section-3-label"] ?? "My Services.",
      labelKey: "sledge.about.section-3-label",
      body: f["sledge.about.section-3-body"] ?? "",
      bodyKey: "sledge.about.section-3-body",
    },
  ];

  return (
    <>
      {/* ── Hero: full-width banner ── */}
      <section
        className="sl-hero-banner relative w-full"
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
          <div className="absolute inset-0 bg-(--sl-green)" />
        )}
      </section>

      {/* ── Heading + three labeled content rows ── */}
      <section
        className="px-7 py-16 md:py-20"
        {...sectionGroupAttr("about", "main")}
      >
        <FadeIn className="mx-auto max-w-7xl">
          <h1
            className="font-heading sl-page-header my-12 leading-6 font-semibold uppercase md:my-16"
            {...fieldAttr("sledge.about-hero-heading")}
          >
            {heading}
          </h1>

          {/* Mobile: stacked label + body per section */}
          <div className="flex flex-col gap-12 md:hidden">
            {sections.map((section, i) => (
              <div key={i} className="flex flex-col gap-3">
                <span
                  className="sl-about-label-mobile text-[20px] font-normal italic"
                  {...fieldAttr(section.labelKey)}
                >
                  {section.label}
                </span>
                <div className="sl-about-divider-mobile h-0.5 w-12 bg-(--sl-coral)" />
                {section.body ? (
                  <p
                    className="sl-about-body-mobile font-normal italic"
                    {...fieldAttr(section.bodyKey)}
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
          <div className="sl-about-grid-desktop hidden w-full pt-16 md:grid">
            <div
              className="sl-about-divider-desktop"
              style={{ gridRow: `1 / ${sections.length + 1}` }}
            />

            {sections.map((section, i) => (
              <Fragment key={i}>
                <div
                  className="self-start pr-8"
                  style={{ gridColumn: 1, gridRow: i + 1 }}
                >
                  <span
                    className="sl-about-label-desktop leading-[1.4rem] font-normal italic"
                    {...fieldAttr(section.labelKey)}
                  >
                    {section.label}
                  </span>
                </div>
                <div
                  className="pl-10"
                  style={{ gridColumn: 3, gridRow: i + 1 }}
                >
                  {section.body && (
                    <p
                      className="sl-about-body-desktop font-normal italic"
                      {...fieldAttr(section.bodyKey)}
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

      {/* No dedicated field group backs this rail (heading is fixed,
          products are pulled live) — no sectionGroupAttr. */}
      <SledgeProductRail
        heading="Trending Now"
        ctaText={shopCtaText}
        ctaHref={shopCtaHref}
        products={products}
      />
    </>
  );
}
