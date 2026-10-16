import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { BambooPageHero } from "~/app/(storefront)/_templates/bamboo/shared/bamboo-page-hero";

import { resolveFields } from ".";
import { getPageWidth, PROSE_WIDE_CLASS } from "../_components/page-width";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function BambooGenericPage({ business, page }: Props) {
  // Generic CMS pages are dynamic DB records, so they can't have a static
  // per-page override field like contact/blog/about do -- only the
  // site-wide global key applies here.
  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.global.page-hero-bg-image",
  ]);
  const heroBgImage = f["bamboo.global.page-hero-bg-image"];
  const wide = getPageWidth(page) === "wide";

  return (
    <PageTransition>
      <BambooPageHero
        title={page.title}
        lede={page.excerpt}
        bgImage={heroBgImage}
      />

      {/* Body sits on the hero's container edge (B1.7): a left-aligned
          max-w-3xl reading column inside the same `max-w-7xl px-4 lg:px-8`
          container as the title band, so h1, lede and body share one left
          edge (x=112 at 1440). The column caps the measure; `max-w-none`
          stops prose's own 65ch cap from re-centering nothing inside it.
          Wide (admin → Pages → Page width): the column is dropped so rows,
          media and tables span the container; `.sp-prose-wide` keeps running
          text at the same 48rem (3xl) measure. */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <div className={wide ? undefined : "max-w-3xl"}>
              <TiptapRenderer
                content={page.content as TiptapJSON}
                className={cn(
                  "prose prose-lg prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/80 prose-strong:text-foreground prose-code:text-primary prose-pre:bg-secondary prose-pre:border prose-pre:border-border prose-li:text-foreground/80 prose-blockquote:text-foreground/70 prose-blockquote:border-primary/40 max-w-none",
                  wide && [PROSE_WIDE_CLASS, "[--sp-prose-measure:48rem]"],
                )}
              />
              <div className={wide ? "max-w-3xl" : undefined}>
                <PlatformPolicyNotice slug={page.slug} />
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </PageTransition>
  );
}
