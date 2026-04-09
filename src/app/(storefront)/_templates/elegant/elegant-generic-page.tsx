import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function ElegantGenericPage({ page }: Props) {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-serif text-4xl font-light tracking-wide text-foreground md:text-5xl">
            {page.title}
          </h1>
          {page.excerpt && (
            <p className="mt-4 text-lg text-muted-foreground">{page.excerpt}</p>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="prose prose-lg prose-headings:font-serif prose-headings:font-light prose-headings:tracking-wide prose-p:text-muted-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:text-muted-foreground max-w-none"
        />
        <PlatformPolicyNotice slug={page.slug} />
      </section>
    </div>
  );
}
