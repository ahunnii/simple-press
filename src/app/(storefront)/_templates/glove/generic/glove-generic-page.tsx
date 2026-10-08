import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/utils";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

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

/**
 * `/<slug>` — any CMS page. Navy title band (H1 = page title, excerpt as the
 * sub-line) + a centered prose column on glove tokens. Policy pages get a
 * "Policy" overline and a last-updated line. The `easy-guide` slug takes the
 * guide branch instead: no band, the shared steps block as the page opener.
 */
export function GloveGenericPage({ business, page }: Props) {
  if (page.slug === GLOVE_EASY_GUIDE_SLUG) {
    return <GloveEasyGuide business={business} page={page} />;
  }

  const isPolicy = page.type === "policy";

  return (
    <GloveGeneralLayout
      title={page.title}
      subtitle={page.excerpt ?? ""}
      breadcrumb={[{ label: "Home", href: "/" }, { label: page.title }]}
    >
      {/* No reveal: rich text can embed forms, and a form must never start hidden. */}
      <GloveSection tone="paper" reveal={false} contained={false}>
        <GloveContainer>
          <div className="mx-auto max-w-[860px]">
            {isPolicy ? (
              <div className="mb-8 flex flex-col gap-1 border-b border-[var(--glove-line)] pb-5">
                <GloveOverline align="left">Policy</GloveOverline>
                <p className="glove-body text-[13px] text-[var(--glove-muted)]">
                  Last updated · {formatDate(page.updatedAt)}
                </p>
              </div>
            ) : null}
            <GloveProse content={page.content as unknown} />
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </GloveContainer>
      </GloveSection>
    </GloveGeneralLayout>
  );
}
