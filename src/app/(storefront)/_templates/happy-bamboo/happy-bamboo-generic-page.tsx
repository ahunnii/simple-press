import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { getPageWidth, PROSE_WIDE_CLASS } from "../_components/page-width";
import { HappyBambooPageShelf } from "./shared/happy-bamboo-page-shelf";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/**
 * Owner-authored pages and policy pages (`/<slug>`, `/privacy-policy`, …).
 * `page.title` + `page.excerpt` sit in the shared page shelf (no badge, no
 * image); the body is a left-aligned `max-w-3xl` prose column on the shelf's
 * container edge, so the h1 and the text share one left edge and lines keep
 * a readable measure. Wide (admin → Pages → Page width) drops the column so
 * rows, media and tables span the container; `.sp-prose-wide` keeps running
 * text at the same 48rem (3xl). No `sectionGroupAttr`: the copy lives on the page
 * record, not in template fields, and Default's generic page declares no
 * section for it.
 */
export function HappyBambooGenericPage({ page }: Props) {
  const wide = getPageWidth(page) === "wide";
  return (
    <PageTransition>
      <HappyBambooPageShelf title={page.title} subtitle={page.excerpt ?? ""} />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className={cn("min-w-0", !wide && "max-w-3xl")}>
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className={cn(
                "prose prose-lg prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/80 prose-strong:text-foreground prose-code:text-primary prose-pre:bg-background prose-pre:border prose-pre:border-border break-words",
                wide
                  ? [PROSE_WIDE_CLASS, "max-w-none [--sp-prose-measure:48rem]"]
                  : "max-w-3xl",
              )}
            />
            <div className={wide ? "max-w-3xl" : undefined}>
              <PlatformPolicyNotice slug={page.slug} />
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
