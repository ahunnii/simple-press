import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { FadeIn, PageTransition } from "./bamboo-animations";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function BambooGenericPage({ page }: Props) {
  return (
    <PageTransition>
      <section className="bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-16 md:flex-row md:py-24 lg:px-8">
          <FadeIn
            direction="right"
            className="flex flex-1 flex-col items-start gap-6"
          >
            <h1 className="text-foreground font-heading text-4xl leading-tight font-bold tracking-tight md:text-5xl">
              <span className="text-balance">{page.title}</span>
            </h1>
            <p className="text-muted-foreground max-w-lg text-lg leading-relaxed">
              {page.excerpt}
            </p>
          </FadeIn>
          {/* <FadeIn direction="left" delay={0.15} className="relative flex-1">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
              <Image
                src="/images/septic-safe.jpg"
                alt="Illustration showing bamboo toilet paper dissolving safely in a septic system"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </FadeIn> */}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto max-w-4xl">
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className="prose prose-lg prose-invert prose-headings:text-foreground prose-p:text-foreground/80 prose-a:text-primary prose-a:no-underline hover:prose-a:text-primary/80 prose-strong:text-foreground prose-code:text-primary prose-pre:bg-background prose-pre:border prose-pre:border-border max-w-none"
            />
          </div>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
