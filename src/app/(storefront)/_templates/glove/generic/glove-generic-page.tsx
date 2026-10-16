import type { RouterOutputs } from "~/trpc/react";
import { cn, formatDate } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

import { getPageWidth, PROSE_WIDE_CLASS } from "../../_components/page-width";
import { GloveContainer, GloveOverline, GloveSection } from "../shared";
import { GloveEasyGuide } from "./glove-easy-guide";
import { GloveGeneralLayout } from "./glove-general-layout";
import { GloveProse } from "./glove-prose";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/** Slug of the CMS page that carries the shared 6-step block. */
export const GLOVE_EASY_GUIDE_SLUG = "easy-guide";

/** Max width (px) of the generic / policy prose column — and, on Wide pages,
 *  the cap on running text (`--sp-prose-measure`). */
const GLOVE_GENERIC_BODY_WIDTH = 860;

/**
 * `/<slug>` — any CMS page. Banner title band (H1 = page title, excerpt as the
 * sub-line) + a prose column on glove tokens, left-aligned in the glove
 * container so it shares the band copy's left edge. Wide pages (admin →
 * Pages → Page width) use the whole container, text still capped at 860px.
 * Policy pages get a "Policy" overline and a last-updated line. The
 * `easy-guide` slug takes the guide branch instead: no band, the shared steps
 * block as the page opener.
 */
export function GloveGenericPage({ business, page }: Props) {
  if (page.slug === GLOVE_EASY_GUIDE_SLUG) {
    return <GloveEasyGuide business={business} page={page} />;
  }

  const isPolicy = page.type === "policy";
  const wide = getPageWidth(page) === "wide";

  return (
    <GloveGeneralLayout
      bandVariant="banner"
      title={page.title}
      subtitle={page.excerpt ?? ""}
      breadcrumb={[{ label: "Home", href: "/" }, { label: page.title }]}
    >
      {/* No reveal: rich text can embed forms, and a form must never start hidden. */}
      <GloveSection tone="paper" reveal={false} contained={false}>
        <GloveContainer>
          {isPolicy ? (
            <div
              className="mb-8 flex flex-col gap-1 border-b border-[var(--glove-line)] pb-5"
              style={{ maxWidth: GLOVE_GENERIC_BODY_WIDTH }}
            >
              <GloveOverline align="left">Policy</GloveOverline>
              <p className="glove-body text-[13px] text-[var(--glove-muted)]">
                Last updated · {formatDate(page.updatedAt)}
              </p>
            </div>
          ) : null}
          {wide ? (
            // Measure literal mirrors GLOVE_GENERIC_BODY_WIDTH (Tailwind scans it).
            <GloveProse
              content={page.content as unknown}
              className={cn(PROSE_WIDE_CLASS, "[--sp-prose-measure:860px]")}
            />
          ) : (
            <div style={{ maxWidth: GLOVE_GENERIC_BODY_WIDTH }}>
              <GloveProse content={page.content as unknown} />
            </div>
          )}
          <div style={{ maxWidth: GLOVE_GENERIC_BODY_WIDTH }}>
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </GloveContainer>
      </GloveSection>
    </GloveGeneralLayout>
  );
}
