import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { DarkTrendGeneralLayout } from "./dark-trend-general-layout";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function DarkTrendGenericPage({ page }: Props) {
  return (
    <DarkTrendGeneralLayout
      title={page.title}
      excerpt={page.excerpt ?? undefined}
    >
      <div className="mx-auto max-w-4xl">
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="prose prose-lg prose-invert prose-headings:text-white prose-p:text-white/80 prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-strong:text-white prose-code:text-purple-400 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/20 max-w-none"
        />
      </div>
    </DarkTrendGeneralLayout>
  );
}
