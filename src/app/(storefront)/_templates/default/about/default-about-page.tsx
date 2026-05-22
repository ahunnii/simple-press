import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { getRichTextFieldValue } from "~/lib/template-fields";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";

export async function DefaultAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.about.heading",
  ]);

  const storyRichContent = getRichTextFieldValue(
    business?.siteContent?.customFields as unknown,
    "default.about.story-body",
  );

  return (
    <PageTransition className="container mx-auto px-4 py-8 md:px-6 md:py-12">
      <section className="pt-20 pb-16 text-center">
        <FadeIn className="mx-auto w-full max-w-4xl">
          <h1
            className="text-left text-xl leading-none tracking-tight"
            style={{
              fontSize: "clamp(2.1rem, 5.25vw, 3.75rem)",
              letterSpacing: "-0.025em",
            }}
          >
            {f["default.about.heading"]}
          </h1>
        </FadeIn>
      </section>

      <section className="pb-20">
        <FadeIn className="mx-auto w-full max-w-4xl">
          <TiptapRenderer
            content={storyRichContent as TiptapJSON}
            className="prose prose-headings:font-serif prose-headings:font-light prose-headings:italic prose-headings:tracking-tight prose-headings:text-foreground prose-h2:text-[1.75rem] prose-h2:leading-snug prose-h2:mt-12 prose-h2:mb-5 prose-h3:text-[1.25rem] prose-h3:leading-snug prose-h3:mt-10 prose-h3:mb-4 prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.95] prose-p:tracking-[0.01em] prose-p:text-foreground/75 prose-p:mt-0 prose-p:mb-6 prose-strong:font-semibold prose-strong:text-foreground prose-strong:tracking-normal prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-60 prose-li:font-sans prose-li:text-[15px] prose-li:leading-[1.85] prose-li:text-foreground/75 prose-li:tracking-[0.01em] prose-ul:my-4 prose-ol:my-4 prose-blockquote:border-l prose-blockquote:border-foreground/30 prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-[1.1rem] prose-blockquote:text-foreground/60 prose-blockquote:not-italic prose-hr:border-foreground/15 prose-hr:my-10 max-w-none"
          />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
