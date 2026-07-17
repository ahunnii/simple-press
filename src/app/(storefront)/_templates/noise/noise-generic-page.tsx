import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function NoiseGenericPage({ page }: Props) {
  const isPolicyPage = page.type === "policy";

  return (
    <PageTransition>
      {/* ── Centered header — type overline + h1 + excerpt ── */}
      <section className="px-6 pt-20 pb-16 text-center">
        <FadeIn className="mx-auto" style={{ maxWidth: "880px" }}>
          <p className="mb-5 font-mono text-[10px] tracking-[0.28em] text-(--vn-steel-mist) uppercase">
            {isPolicyPage ? "Legal" : "Content"}
          </p>
          <h1
            className="text-[clamp(2.8rem, 7vw, 5rem)] font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {page.title}
          </h1>
          {page.excerpt && (
            <p
              className="mx-auto mt-6 font-sans leading-[1.85]"
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

      <section className="px-6 pb-20">
        <FadeIn className="mx-auto w-full max-w-5xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-headings:font-serif prose-headings:font-light prose-headings:italic prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.95] prose-p:tracking-[0.01em] prose-p:text-foreground/75 prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-foreground prose-strong:tracking-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-60 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-foreground/75 prose-li:tracking-[0.01em] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l prose-blockquote:border-foreground/30 prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-[1.1rem] prose-blockquote:text-foreground/60 prose-blockquote:not-italic prose-hr:border-foreground/15 prose-hr:my-10 max-w-none"
          />

          <PlatformPolicyNotice slug={page.slug} />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
