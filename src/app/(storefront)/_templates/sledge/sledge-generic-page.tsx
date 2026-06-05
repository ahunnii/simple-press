import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

const PROSE =
  "prose max-w-none prose-headings:font-heading prose-headings:uppercase prose-headings:tracking-[0.04em] prose-headings:text-[var(--sl-coral)] prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-[var(--sl-ink-soft)] prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-[var(--sl-ink)] prose-a:text-[var(--sl-coral)] prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-[var(--sl-ink-soft)] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l-4 prose-blockquote:border-[var(--sl-coral)] prose-blockquote:pl-6 prose-blockquote:font-sans prose-blockquote:italic prose-blockquote:text-[var(--sl-ink-soft)] prose-hr:border-[#e8e8e8] prose-hr:my-10";

export function SledgeGenericPage({ page }: Props) {
  const isPolicyPage = page.type === "policy";

  return (
    <PageTransition className="bg-white">
      <section className="px-7 pt-16 pb-10 md:pt-20 md:pb-12">
        <FadeIn className="mx-auto max-w-7xl">
          <p
            className="mb-4 font-sans text-xs tracking-[0.18em] uppercase"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            {isPolicyPage ? "Legal" : ""}
          </p>
          <h1
            className="font-heading uppercase"
            style={{
              fontSize: "clamp(2.5rem, 6.25vw, 4.06rem)",
              color: "var(--sl-orange)",
              letterSpacing: "0.04em",
              lineHeight: 1.1,
            }}
          >
            {page.title}
          </h1>

          {page.excerpt && (
            <p
              className="mt-5 max-w-7xl font-sans text-sm leading-relaxed md:text-base"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              {page.excerpt}
            </p>
          )}
        </FadeIn>
      </section>

      <section className="px-7 pb-16 md:pb-20">
        <FadeIn className="mx-auto max-w-7xl">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={PROSE}
          />
          <PlatformPolicyNotice slug={page.slug} />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
