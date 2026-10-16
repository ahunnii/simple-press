import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { getPageWidth, PROSE_WIDE_CLASS } from "../_components/page-width";
import { DarkTrendGeneralLayout } from "./layout/dark-trend-general-layout";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/**
 * Body sits on the h1's left edge inside the layout's `max-w-7xl` container.
 * Standard: a left-aligned `max-w-4xl` column. Wide (admin → Pages → Page
 * width): the whole container, running text still capped at 56rem (4xl).
 */
export function DarkTrendGenericPage({ page }: Props) {
  const wide = getPageWidth(page) === "wide";
  return (
    <DarkTrendGeneralLayout
      title={page.title}
      excerpt={page.excerpt ?? undefined}
    >
      <div className={wide ? undefined : "max-w-4xl"}>
        <TiptapRenderer
          content={page.content as TiptapJSON}
          className={cn(
            "prose prose-lg prose-invert prose-headings:text-white prose-p:text-white/80 prose-a:text-purple-400 prose-a:no-underline hover:prose-a:text-purple-300 prose-strong:text-white prose-code:text-purple-400 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/20 max-w-none",
            wide && [PROSE_WIDE_CLASS, "[--sp-prose-measure:56rem]"],
          )}
        />
        <div className={wide ? "max-w-4xl" : undefined}>
          <PlatformPolicyNotice slug={page.slug} />
        </div>
      </div>
    </DarkTrendGeneralLayout>
  );
}
