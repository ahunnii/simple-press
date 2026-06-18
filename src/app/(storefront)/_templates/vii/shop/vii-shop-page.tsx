import type { DefaultProductsPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
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
  ]);

  const collections = await api.collections.getAllPublic();
  const products = (business.products ?? []) as unknown as Product[];

  const overline = f["vii.shop.intro-overline"] ?? "";
  const heading = f["vii.shop.intro-heading"] ?? "";
  const accent = f["vii.shop.intro-accent"] ?? "";

  return (
    <div>
      {/* Editorial intro */}
      <section
        aria-labelledby="vii-shop-heading"
        style={{
          background: "var(--vii-cream)",
          // Top value clears the fixed header (announcement bar + nav ≈ 106px)
          padding:
            "clamp(124px, 13vw, 150px) clamp(24px, 6vw, 96px) clamp(40px, 5vw, 64px)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          {overline && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--vii-ink-soft)",
                margin: "0 0 14px",
              }}
            >
              {overline}
            </p>
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
        </div>
      </section>

      <ViiShopClient
        products={products}
        collections={collections}
        collectionsOverline={f["vii.shop.collections-overline"] ?? ""}
        collectionsHeading={f["vii.shop.collections-heading"] ?? ""}
      />
    </div>
  );
}
