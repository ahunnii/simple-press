import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { PollenGeneralLayout } from "./pollen-general-layout";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function PollenGenericPage({ business, page }: Props) {
  return (
    <PollenGeneralLayout
      business={business}
      title={page.title}
      subtitle={page.excerpt ?? ""}
    >
      <div className="mx-auto max-w-7xl py-20 md:py-32">
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className="prose prose-lg prose-invert prose-headings:text-black prose-p:text-black/80 prose-a:text-[#1f1f1f] prose-a:no-underline hover:prose-a:text-green-600 prose-strong:text-black prose-code:text-green-400 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-black/20 max-w-none"
        />
      </div>
    </PollenGeneralLayout>
  );
}
