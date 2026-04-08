import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function NoiseGenericPage({ page }: Props) {
  return (
    <PageTransition>
      <section className="border-b border-border bg-secondary">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
          <FadeIn>
            <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
              Visual Noise Detroit
            </p>
            <h1 className="font-serif text-5xl font-light leading-tight tracking-tight text-foreground md:text-6xl">
              {page.title}
            </h1>
            {page.excerpt && (
              <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-muted-foreground">
                {page.excerpt}
              </p>
            )}
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <FadeIn direction="up">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:font-light prose-p:font-sans prose-p:text-muted-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-strong:font-medium prose-strong:text-foreground"
          />
          <PlatformPolicyNotice slug={page.slug} />
        </FadeIn>
      </section>
    </PageTransition>
  );
}
