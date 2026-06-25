import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { api } from "~/trpc/server";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { ViiOverline } from "../shared/vii-overline";
import { ViiReveal } from "../shared/vii-reveal";
import { ViiShopClient } from "./vii-shop-client";

export async function ViiShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "vii.shop.intro-overline",
    "vii.shop.intro-heading",
    "vii.shop.intro-accent",
    "vii.shop.intro-body",
    "vii.shop.collections-overline",
    "vii.shop.collections-heading",
    // Promo band — left (navy / gift cards)
    "vii.shop.promo-left-overline",
    "vii.shop.promo-left-heading",
    "vii.shop.promo-left-accent",
    "vii.shop.promo-left-body",
    "vii.shop.promo-left-image",
    "vii.shop.promo-left-button-label",
    "vii.shop.promo-left-button-link",
    // Promo band — right (cream / haircare)
    "vii.shop.promo-right-overline",
    "vii.shop.promo-right-heading",
    "vii.shop.promo-right-accent",
    "vii.shop.promo-right-body",
    "vii.shop.promo-right-image",
    "vii.shop.promo-right-button-label",
    "vii.shop.promo-right-button-link",
    // Brands marquee toggle
    "vii.shop.show-brands",
    // Homepage brand fields reused for the shop brands marquee
    "vii.homepage.brands-overline",
    "vii.homepage.brands-heading",
  ]);

  const collections = await api.collections.getAllPublic();
  const products = (business.products ?? []) as unknown as Product[];

  const overline = f["vii.shop.intro-overline"] ?? "";
  const heading = f["vii.shop.intro-heading"] ?? "";
  const accent = f["vii.shop.intro-accent"] ?? "";

  const promo = {
    left: {
      overline: f["vii.shop.promo-left-overline"] ?? "",
      heading: f["vii.shop.promo-left-heading"] ?? "",
      accent: f["vii.shop.promo-left-accent"] ?? "",
      body: f["vii.shop.promo-left-body"] ?? "",
      image: f["vii.shop.promo-left-image"] ?? "",
      buttonLabel: f["vii.shop.promo-left-button-label"] ?? "",
      buttonLink: f["vii.shop.promo-left-button-link"] ?? "",
    },
    right: {
      overline: f["vii.shop.promo-right-overline"] ?? "",
      heading: f["vii.shop.promo-right-heading"] ?? "",
      accent: f["vii.shop.promo-right-accent"] ?? "",
      body: f["vii.shop.promo-right-body"] ?? "",
      image: f["vii.shop.promo-right-image"] ?? "",
      buttonLabel: f["vii.shop.promo-right-button-label"] ?? "",
      buttonLink: f["vii.shop.promo-right-button-link"] ?? "",
    },
  };

  const showBrands = f["vii.shop.show-brands"] === "true";

  const brandLogos = parseTemplateListRows(
    customFields?.["vii.homepage.brands-logos"],
  );

  const brands = {
    overline: f["vii.homepage.brands-overline"] ?? "",
    heading: f["vii.homepage.brands-heading"] ?? "",
    logos: brandLogos,
  };

  return (
    <div>
      {/* Editorial intro */}
      <section
        aria-labelledby="vii-shop-heading"
        style={{
          background: "var(--vii-cream)",
          // Clear the fixed header (≈106px) plus generous editorial breathing room.
          padding:
            "calc(var(--vii-header-offset) + clamp(40px, 6vw, 72px)) clamp(24px, 6vw, 96px) clamp(40px, 5vw, 64px)",
        }}
      >
        <ViiReveal style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          {overline && (
            <ViiOverline
              align="center"
              tone="light"
              style={{ marginBottom: 14 }}
            >
              {overline}
            </ViiOverline>
          )}
          <h1
            id="vii-shop-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5.5vw, 64px)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {heading}
            {heading && accent ? " " : ""}
            {accent && (
              <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
                {accent}
              </em>
            )}
          </h1>
          {f["vii.shop.intro-body"] && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                maxWidth: 620,
                margin: "20px auto 0",
              }}
            >
              {f["vii.shop.intro-body"]}
            </p>
          )}
        </ViiReveal>
      </section>

      <ViiShopClient
        products={products}
        collections={collections}
        collectionsOverline={f["vii.shop.collections-overline"] ?? ""}
        collectionsHeading={f["vii.shop.collections-heading"] ?? ""}
        promo={promo}
        showBrands={showBrands}
        brands={brands}
      />
    </div>
  );
}
