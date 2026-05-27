import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function ElegantGenericPage({ page }: Props) {
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
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="el-generic-body"
          />
          <PlatformPolicyNotice slug={page.slug} />
        </div>
      </section>

      <style>{`
        .el-generic-body {
          font-size: 17px;
          line-height: 1.8;
          color: var(--el-ink-2, #2a2722);
          font-family: var(--font-sans, sans-serif);
        }
        .el-generic-body h1,
        .el-generic-body h2,
        .el-generic-body h3,
        .el-generic-body h4 {
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: var(--el-ink, #1c1a17);
          margin: 40px 0 16px;
        }
        .el-generic-body h1 { font-size: clamp(28px, 3.5vw, 44px); }
        .el-generic-body h2 { font-size: clamp(24px, 2.8vw, 36px); }
        .el-generic-body h3 { font-size: clamp(20px, 2.2vw, 28px); }
        .el-generic-body p {
          margin-top: 16px;
          color: var(--el-ink-2, #2a2722);
        }
        .el-generic-body a {
          color: var(--el-ink, #1c1a17);
          text-underline-offset: 3px;
        }
        .el-generic-body ul,
        .el-generic-body ol {
          padding-left: 24px;
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: var(--el-ink-2, #2a2722);
        }
        .el-generic-body li { line-height: 1.65; }
        .el-generic-body blockquote {
          margin: 36px 0;
          padding: 24px 0 24px 28px;
          border-left: 1px solid var(--el-sage, #4a5240);
          font-family: var(--font-serif, 'Cormorant Garamond', serif);
          font-style: italic;
          font-size: clamp(20px, 2.2vw, 28px);
          line-height: 1.35;
          color: var(--el-ink, #1c1a17);
        }
        .el-generic-body hr {
          border: none;
          border-top: 1px solid var(--el-line, rgba(28,26,23,0.12));
          margin: 40px 0;
        }
        .el-generic-body strong {
          font-weight: 600;
          color: var(--el-ink, #1c1a17);
        }
        .el-generic-body img {
          border-radius: 6px;
          margin: 28px 0;
          width: 100%;
        }
        .el-generic-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 28px 0;
          font-size: 15px;
        }
        .el-generic-body th {
          text-align: left;
          padding: 10px 16px;
          border-bottom: 1px solid var(--el-line, rgba(28,26,23,0.12));
          font-family: var(--font-mono, ui-monospace);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--el-ink-soft, #6b6659);
          font-weight: 400;
        }
        .el-generic-body td {
          padding: 10px 16px;
          border-bottom: 1px solid var(--el-line-2, rgba(28,26,23,0.06));
          color: var(--el-ink-2, #2a2722);
        }
      `}</style>
    </div>
  );
}
