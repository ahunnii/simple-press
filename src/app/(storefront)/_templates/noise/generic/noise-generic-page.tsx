import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import {
  getPageWidth,
  PROSE_WIDE_CENTERED_CLASS,
} from "../../_components/page-width";
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
  // Page width = Wide: the shell's `wide` container (1320, the footer's
  // edge) instead of the centred `max-w-3xl` column; text blocks stay
  // centred at that column's text width (42rem = max-w-3xl minus its px-6)
  // via `.sp-prose-wide--centered`. `NOISE_PROSE_CLASS` already ends in
  // `max-w-none`, so the renderer root has no cap to lift.
  const wide = getPageWidth(page) === "wide";

  return (
    <PageTransition>
      <NoisePageBand
        overline={isPolicyPage ? "Legal" : "Content"}
        title={page.title}
        intro={page.excerpt}
      />

      <NoisePageBody width={wide ? "wide" : "measure"} aria-label={page.title}>
        <FadeIn>
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className={
              wide
                ? `${NOISE_PROSE_CLASS} ${PROSE_WIDE_CENTERED_CLASS} [--sp-prose-measure:42rem]`
                : NOISE_PROSE_CLASS
            }
          />

          {wide ? (
            <div className="mx-auto w-full max-w-2xl">
              <PlatformPolicyNotice slug={page.slug} />
            </div>
          ) : (
            <PlatformPolicyNotice slug={page.slug} />
          )}
        </FadeIn>
      </NoisePageBody>
    </PageTransition>
  );
}
