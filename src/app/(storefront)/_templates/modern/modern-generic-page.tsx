import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

import { ModernGeneralLayout } from "./modern-general-layout";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function ModernGenericPage({ page }: Props) {
  return (
    <ModernGeneralLayout
      title={page.title}
      excerpt={page.excerpt ?? undefined}
    >
      <section className="bg-background py-16">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:font-normal prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70 prose-strong:font-medium prose-strong:text-foreground"
          />
          <PlatformPolicyNotice slug={page.slug} />
        </div>
      </section>
    </ModernGeneralLayout>
  );
}
