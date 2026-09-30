import type { DefaultCartPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { ElegantCartContent } from "./elegant-cart-content";

export function ElegantCartPage({ business }: DefaultCartPageTemplateProps) {
  const f = resolveFields(business.siteContent?.customFields, [
    "elegant.global.cart-page-label",
    "elegant.global.cart-page-heading",
    "elegant.global.cart-page-empty-heading",
    "elegant.global.cart-empty-body",
    "elegant.global.cart-browse-button",
    "elegant.global.cart-page-note",
  ]);

  return (
    <div
      style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "100vh" }}
      {...sectionGroupAttr("global", "cart")}
    >
      {/* Header */}
      <section style={{ padding: "48px 40px 40px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <span
            {...fieldAttr("elegant.global.cart-page-label")}
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              display: "block",
              marginBottom: 16,
            }}
          >
            {f["elegant.global.cart-page-label"] ?? ""}
          </span>
          <h1
            {...fieldAttr("elegant.global.cart-page-heading")}
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(48px, 7vw, 84px)",
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              color: "var(--el-ink, #1c1a17)",
            }}
          >
            {f["elegant.global.cart-page-heading"] ?? ""}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: "0 40px 80px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <ElegantCartContent
            emptyHeading={f["elegant.global.cart-page-empty-heading"] ?? ""}
            emptyBody={f["elegant.global.cart-empty-body"] ?? ""}
            browseButtonText={f["elegant.global.cart-browse-button"] ?? ""}
            checkoutNote={f["elegant.global.cart-page-note"] ?? ""}
          />
        </div>
      </section>
    </div>
  );
}
