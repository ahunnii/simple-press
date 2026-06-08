import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { PollenGeneralLayout } from "./layout/pollen-general-layout";

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
      <FadeIn direction="up">
        <div className="mx-auto max-w-7xl py-20 md:py-32">
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="prose prose-lg prose-headings:text-black prose-p:text-black/80 prose-a:text-[#215935] prose-a:underline hover:prose-a:text-[#1a4729] prose-strong:text-black prose-code:text-green-700 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-black/20 max-w-none"
          />
          <PlatformPolicyNotice slug={page.slug} />
        </div>
      </FadeIn>
    </PollenGeneralLayout>
  );
}
