import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { getRichTextFieldValue } from "~/lib/template-fields";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "../index";

export function NoiseAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields as Record<string, string> | undefined, [
    "noise.about-hero-heading",
  ]);

  const storyRichContent = getRichTextFieldValue(
    customFields as unknown,
    "noise.about-story-body",
  );

  return (
    <PageTransition>
      {/* ── Centered header — "Our Story" overline + h1 + intro ── */}
      <section
        className="px-6 pt-20 pb-16 text-center"
        {...sectionGroupAttr("about", "main")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "980px" }}>
          <p className="mb-5 font-mono text-[10px] tracking-[0.28em] text-(--vn-steel-mist) uppercase">
            Our Story
          </p>
          <h1
            className="text-[clamp(2.8rem, 7vw, 5rem)] font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {f["noise.about-hero-heading"]}
          </h1>
        </FadeIn>
      </section>

      <section className="px-6 pb-20" {...sectionGroupAttr("about", "main")}>
        <FadeIn className="mx-auto w-full max-w-5xl">
          <TiptapRenderer
            content={storyRichContent as TiptapJSON}
            className="prose prose-headings:font-serif prose-headings:font-light prose-headings:italic prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.95] prose-p:tracking-[0.01em] prose-p:text-foreground/75 prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-foreground prose-strong:tracking-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-60 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-foreground/75 prose-li:tracking-[0.01em] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l prose-blockquote:border-foreground/30 prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-[1.1rem] prose-blockquote:text-foreground/60 prose-blockquote:not-italic prose-hr:border-foreground/15 prose-hr:my-10 max-w-none"
          />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
