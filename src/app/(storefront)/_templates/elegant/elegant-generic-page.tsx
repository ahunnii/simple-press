import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  getPageWidth,
  PROSE_WIDE_CENTERED_CLASS,
} from "../_components/page-width";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function ElegantGenericPage({ page }: Props) {
  // Page width = Wide: the body uses elegant's 1360 inner-page container
  // (cart/contact/product); text blocks stay centred at the 760 measure and
  // the hero + divider stay as they are.
  const wide = getPageWidth(page) === "wide";

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)" }}>
      {/* ── Page hero ── */}
      <section style={{ padding: "48px 40px 40px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(40px, 6vw, 80px)",
              lineHeight: 0.97,
              letterSpacing: "-0.01em",
              color: "var(--el-ink, #1c1a17)",
              marginBottom: page.excerpt ? 20 : 0,
            }}
          >
            {page.title}
          </h1>
          {page.excerpt && (
            <p
              style={{
                fontSize: 18,
                lineHeight: 1.65,
                color: "var(--el-ink-soft, #6b6659)",
                fontFamily: "var(--font-sans, sans-serif)",
                marginTop: 20,
              }}
            >
              {page.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* ── Divider ── */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto 0",
          padding: "0 40px",
          borderTop: "1px solid var(--el-line, rgba(28,26,23,0.12))",
        }}
      />

      {/* ── Body ── */}
      <section style={{ padding: "48px 40px 80px" }}>
        <div style={{ maxWidth: wide ? 1360 : 760, margin: "0 auto" }}>
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={
              wide
                ? `el-generic-body ${PROSE_WIDE_CENTERED_CLASS} [--sp-prose-measure:760px]`
                : "el-generic-body"
            }
          />
          {wide ? (
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <PlatformPolicyNotice slug={page.slug} />
            </div>
          ) : (
            <PlatformPolicyNotice slug={page.slug} />
          )}
        </div>
      </section>
    </div>
  );
}
