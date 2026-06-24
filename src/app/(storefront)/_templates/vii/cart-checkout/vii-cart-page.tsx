import Link from "next/link";

import type { DefaultCartPageTemplateProps } from "../../types";

import { resolveFields } from "..";
import { ViiOverline } from "../shared/vii-overline";
import { ViiReveal } from "../shared/vii-reveal";
import { ViiCartContents } from "./vii-cart-contents";

export async function ViiCartPage({ business }: DefaultCartPageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "vii.cart.overline",
    "vii.cart.heading",
    "vii.cart.empty-heading",
    "vii.cart.empty-body",
    "vii.cart.empty-cta",
    "vii.cart.continue-shopping",
  ]);

  const overline = f["vii.cart.overline"] ?? "";
  const heading = f["vii.cart.heading"] ?? "";

  return (
    <div style={{ background: "var(--vii-cream)", minHeight: "100vh" }}>
      {/* Hero band — breadcrumb + overline + h1 */}
      <section
        aria-label="Cart page header"
        style={{
          background: "var(--vii-cream)",
          padding:
            "clamp(144px, 14vw, 192px) clamp(24px, 6vw, 96px) clamp(40px, 5vw, 60px)",
          borderBottom: "1px solid var(--vii-hairline)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ marginBottom: 20 }}>
            <ol
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                listStyle: "none",
                margin: 0,
                padding: 0,
                fontFamily: "var(--font-sans)",
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--vii-ink-soft)",
              }}
            >
              <li>
                <Link
                  href="/"
                  className="vii-nav-link"
                  style={{
                    color: "var(--vii-ink-soft)",
                    textDecoration: "none",
                    position: "relative",
                  }}
                >
                  Home
                </Link>
              </li>
              <li aria-hidden="true" style={{ opacity: 0.4 }}>
                /
              </li>
              <li aria-current="page" style={{ color: "var(--vii-navy)" }}>
                Cart
              </li>
            </ol>
          </nav>

          <ViiReveal>
            {/* Overline */}
            {overline && (
              <ViiOverline tone="light" style={{ marginBottom: 16 }}>
                {overline}
              </ViiOverline>
            )}

            {/* h1 — one per page, serif display */}
            <h1
              id="vii-cart-heading"
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 500,
                fontSize: "clamp(32px, 5vw, 56px)",
                lineHeight: 1.08,
                color: "var(--vii-navy)",
                margin: 0,
                textWrap: "balance",
              }}
            >
              {heading}
            </h1>
          </ViiReveal>
        </div>
      </section>

      {/* Cart contents */}
      <section
        aria-label="Cart items"
        style={{
          padding:
            "clamp(40px, 6vh, 72px) clamp(24px, 6vw, 96px) clamp(64px, 10vh, 120px)",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <ViiCartContents
            business={business}
            emptyHeading={f["vii.cart.empty-heading"] ?? ""}
            emptyBody={f["vii.cart.empty-body"] ?? ""}
            emptyCta={f["vii.cart.empty-cta"] ?? ""}
            continueShoppingLabel={f["vii.cart.continue-shopping"] ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
