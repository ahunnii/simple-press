import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  NOISE_PROSE_CLASS,
  NoisePageBand,
  NoisePageBody,
} from "./noise-page-shell";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/**
 * noise's generic CMS page (`/<slug>`, `/privacy-policy`, …) on the page
 * shell: the centred title band (mono overline, italic Cormorant h1,
 * excerpt), then the Tiptap body in a centred `max-w-3xl` column under it
 * (PF14 / B1.7 — was a left-aligned `max-w-5xl` with ~110ch lines).
 *
 * No band "Last updated" line: the standard policy templates already open
 * with one in their body, so a band line would print the date twice.
 */
export function NoiseGenericPage({ page }: Props) {
  const isPolicyPage = page.type === "policy";

  return (
    <PageTransition>
      <NoisePageBand
        overline={isPolicyPage ? "Legal" : "Content"}
        title={page.title}
        intro={page.excerpt}
      />

      <NoisePageBody width="measure" aria-label={page.title}>
        <FadeIn>
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={NOISE_PROSE_CLASS}
          />

          <PlatformPolicyNotice slug={page.slug} />
        </FadeIn>
      </NoisePageBody>
    </PageTransition>
  );
}
