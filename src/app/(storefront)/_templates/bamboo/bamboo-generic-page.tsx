import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { BambooPageHero } from "~/app/(storefront)/_templates/bamboo/shared/bamboo-page-hero";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function BambooGenericPage({ page }: Props) {
  return (
    <PageTransition>
      <BambooPageHero title={page.title} lede={page.excerpt} />

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto max-w-4xl">
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className="prose prose-lg prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/80 prose-strong:text-foreground prose-code:text-primary prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-li:text-foreground/80 prose-blockquote:text-foreground/70 prose-blockquote:border-primary/40 mx-auto max-w-[70ch]"
            />
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
