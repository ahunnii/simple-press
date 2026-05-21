import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function NoiseGenericPage({ page }: Props) {
  const isPolicyPage = page.type === "policy";

  return (
    <PageTransition>
      {/* ── Centered header — type overline + h1 + excerpt ── */}
      <section
        className="border-b border-foreground/15 px-6 pt-20 pb-14 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "880px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-5"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            {isPolicyPage ? "Legal" : "Content"}
          </p>
          <h1
            className="font-serif italic leading-[1.0] tracking-tight"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {page.title}
          </h1>
          {page.excerpt && (
            <p
              className="font-sans mt-6 mx-auto leading-[1.85]"
              style={{
                fontSize: "15px",
                color: "var(--vn-ink-soft)",
                maxWidth: "60ch",
              }}
            >
              {page.excerpt}
            </p>
          )}
        </FadeIn>
      </section>

      {/* ── Body content — centered max-width prose ── */}
      <section className="px-7 py-16" style={{ background: "var(--vn-paper)" }}>
        <FadeIn>
          <div className="mx-auto max-w-3xl">
            {/* Rule separator with title */}
            <div
              className="flex items-center gap-4 mb-10 pb-5 border-b"
              style={{ borderColor: "var(--vn-rule)" }}
            >
              <span
                className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                {page.title}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--vn-rule)" }} />
              {isPolicyPage && (
                <span
                  className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Legal
                </span>
              )}
            </div>

            <TiptapRenderer
              content={page.content as TiptapJSON}
              className="prose prose-base max-w-none
                prose-headings:font-serif prose-headings:italic prose-headings:font-light prose-headings:tracking-tight
                prose-h2:text-[2rem] prose-h2:leading-tight prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-[1.5rem] prose-h3:leading-tight prose-h3:mt-8 prose-h3:mb-3
                prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-foreground/80
                prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70
                prose-strong:font-medium prose-strong:text-foreground
                prose-li:font-sans prose-li:text-[15px] prose-li:text-foreground/80
                prose-blockquote:border-l-2 prose-blockquote:border-foreground prose-blockquote:pl-6
                prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-xl
                prose-hr:border-foreground/20"
            />
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
