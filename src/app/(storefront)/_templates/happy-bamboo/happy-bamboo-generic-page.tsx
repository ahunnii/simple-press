import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { HappyBambooPageShelf } from "./shared/happy-bamboo-page-shelf";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/**
 * Owner-authored pages and policy pages (`/<slug>`, `/privacy-policy`, …).
 * `page.title` + `page.excerpt` sit in the shared page shelf (no badge, no
 * image); the body is a left-aligned `max-w-3xl` prose column on the shelf's
 * container edge, so the h1 and the text share one left edge and lines keep
 * a readable measure. No `sectionGroupAttr`: the copy lives on the page
 * record, not in template fields, and Default's generic page declares no
 * section for it.
 */
export function HappyBambooGenericPage({ page }: Props) {
  return (
    <PageTransition>
      <HappyBambooPageShelf title={page.title} subtitle={page.excerpt ?? ""} />

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <FadeIn className="max-w-3xl min-w-0">
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className="prose prose-lg prose-headings:text-foreground prose-p:text-foreground/80 prose-li:text-foreground/80 prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/80 prose-strong:text-foreground prose-code:text-primary prose-pre:bg-background prose-pre:border prose-pre:border-border max-w-3xl break-words"
            />
            <PlatformPolicyNotice slug={page.slug} />
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
