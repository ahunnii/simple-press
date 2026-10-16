import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  getPageWidth,
  PROSE_WIDE_CENTERED_CLASS,
} from "../_components/page-width";
import { PollenGeneralLayout } from "./layout/pollen-general-layout";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};
export function PollenGenericPage({ business, page }: Props) {
  // Page width = Wide: drop the inner `max-w-3xl` column so the body takes
  // the full `max-w-7xl` container, lift the Typography `prose` 65ch cap
  // (`max-w-none`), and re-apply 65ch to direct-child text blocks only,
  // centred (`.sp-prose-wide--centered`) under pollen's centred hero.
  const wide = getPageWidth(page) === "wide";

  return (
    <PollenGeneralLayout
      business={business}
      title={page.title}
      subtitle={page.excerpt ?? ""}
    >
      <FadeIn direction="up">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-32 lg:px-8">
          <div className={wide ? undefined : "mx-auto max-w-3xl"}>
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className={`${wide ? `max-w-none ${PROSE_WIDE_CENTERED_CLASS} [--sp-prose-measure:65ch]` : ""}prose prose-lg prose-headings:text-black prose-p:text-black/80 prose-a:text-[#215935] prose-a:underline hover:prose-a:text-[#1a4729] prose-strong:text-black prose-code:text-green-700 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-black/20`}
            />
            {wide ? (
              <div className="mx-auto max-w-3xl">
                <PlatformPolicyNotice slug={page.slug} />
              </div>
            ) : (
              <PlatformPolicyNotice slug={page.slug} />
            )}
          </div>
        </div>
      </FadeIn>
    </PollenGeneralLayout>
  );
}
