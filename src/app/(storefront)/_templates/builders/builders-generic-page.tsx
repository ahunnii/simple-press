import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

function formatUpdated(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function BuildersGenericPage({ page }: Props) {
  const eyebrow = page.type === "policy" ? "Legal" : "Content";

  return (
    <PageTransition>
      {/* ── Page header: eyebrow overline + uppercase title + accent excerpt ── */}
      <section className="border-b border-[#e5e7eb] px-4 pt-20 pb-14 md:px-12">
        <FadeIn className="mx-auto w-full max-w-[1280px]">
          {/* Eyebrow / overline — Agdasima, peach, all-caps */}
          <p
            className="mb-5 text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              color: "#FFC5B6",
            }}
          >
            {eyebrow}
          </p>

          {/* Title — Jost light, uppercase, large display size */}
          <h1
            className="text-[clamp(2.4rem,6vw,4.5rem)] font-light uppercase leading-none tracking-[-0.02em]"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              color: "#131313",
            }}
          >
            {page.title}
          </h1>

          {/* Excerpt — accent left-border intro, Agdasima, muted ink */}
          {page.excerpt && (
            <p
              className="mt-6 max-w-2xl border-l-2 pl-5 text-[17px] leading-relaxed"
              style={{
                borderColor: "#FFC5B6",
                color: "#4a4a4a",
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
              }}
            >
              {page.excerpt}
            </p>
          )}

          {/* Last updated — small Agdasima overline */}
          <p
            className="mt-5 text-[11px] uppercase tracking-[0.14em]"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              color: "#9a9a9a",
            }}
          >
            Last updated · {formatUpdated(page.updatedAt)}
          </p>
        </FadeIn>
      </section>

      {/* ── Body content: constrained prose, builders-themed ── */}
      <section className="px-4 pt-16 pb-24 md:px-12">
        <FadeIn className="mx-auto w-full max-w-[1280px]">
          <article className="max-w-2xl">
            {/*
             * Prose theming — inline modifier approach (same as default-generic-page).
             * Hex literals are required because Tailwind JIT can't resolve CSS vars
             * inside arbitrary-value prose-* modifiers at build time.
             *
             * Font families: .builders scopes --font-sans → Jost and h1-h4 to Jost,
             * so prose-headings:font-sans correctly maps to Jost within .builders.
             * Body paragraphs inherit Agdasima from .builders { font-family: … }.
             */}
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className={[
                "prose",
                // Headings — Jost, uppercase, light weight, border-b rule on h2
                "prose-headings:font-sans",
                "prose-headings:font-light",
                "prose-headings:uppercase",
                "prose-headings:tracking-tight",
                "prose-headings:text-[#131313]",
                "prose-h2:text-[1.5rem]",
                "prose-h2:leading-snug",
                "prose-h2:mt-12",
                "prose-h2:mb-4",
                "prose-h2:pb-2",
                "prose-h2:border-b",
                "prose-h2:border-[#e5e7eb]",
                "prose-h3:text-[1.15rem]",
                "prose-h3:leading-snug",
                "prose-h3:mt-8",
                "prose-h3:mb-3",
                // Paragraphs — muted ink, Agdasima via inheritance
                "prose-p:text-[15px]",
                "prose-p:leading-[1.85]",
                "prose-p:text-[#4a4a4a]",
                "prose-p:mb-5",
                // Emphasis
                "prose-strong:font-semibold",
                "prose-strong:text-[#131313]",
                "prose-em:text-[#4a4a4a]",
                // Links
                "prose-a:text-[#131313]",
                "prose-a:underline",
                "prose-a:underline-offset-4",
                "hover:prose-a:text-[#FFC5B6]",
                // Lists — muted body ink
                "prose-li:text-[15px]",
                "prose-li:leading-[1.85]",
                "prose-li:text-[#4a4a4a]",
                "prose-ul:my-4",
                "prose-ol:my-4",
                // Blockquote — peach left border (pull-quote aesthetic)
                "prose-blockquote:border-l-2",
                "prose-blockquote:border-[#FFC5B6]",
                "prose-blockquote:pl-5",
                "prose-blockquote:not-italic",
                "prose-blockquote:text-[#131313]",
                "prose-blockquote:font-light",
                // Horizontal rule — peach-adjacent rule between sections
                "prose-hr:border-[#e5e7eb]",
                "prose-hr:my-10",
                // Images — full width with subtle border
                "prose-img:border",
                "prose-img:border-[#e5e7eb]",
                // Tables
                "prose-th:text-[11px]",
                "prose-th:font-medium",
                "prose-th:tracking-[0.1em]",
                "prose-th:uppercase",
                "prose-th:text-[#4a4a4a]",
                // Disable the max-width cap that prose adds by default
                "max-w-none",
              ].join(" ")}
            />

            <PlatformPolicyNotice slug={page.slug} />
          </article>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
