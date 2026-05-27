import type { DefaultCartPageTemplateProps } from "../../types";

import { ElegantCartContent } from "./elegant-cart-content";

export function ElegantCartPage({ business: _ }: DefaultCartPageTemplateProps) {
  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "100vh" }}>
      {/* Header */}
      <section style={{ padding: "48px 40px 40px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <span style={{
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--el-ink-soft, #6b6659)",
            display: "block",
            marginBottom: 16,
          }}>
            Review
          </span>
          <h1 style={{
            fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
            fontWeight: 400,
            fontSize: "clamp(48px, 7vw, 84px)",
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
            color: "var(--el-ink, #1c1a17)",
          }}>
            Your bag.
          </h1>
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: "0 40px 80px" }}>
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <ElegantCartContent />
        </div>
      </section>
    </div>
  );
}
