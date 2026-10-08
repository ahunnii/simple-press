import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

import { GloveSection } from "../shared";
import { GloveSteps, resolveGloveStepsFields } from "../steps";
import { GloveProse, hasProseContent } from "./glove-prose";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

/**
 * The `easy-guide` branch of the generic page. No navy band (matches the live
 * page): the visible h1 is the steps heading, followed by the shared
 * 6-step block with each step's own button, then the page's own rich text
 * (when it has any) below in prose. The step fields live on the homepage page
 * key, so one edit updates the homepage and this page.
 */
export async function GloveEasyGuide({ business, page }: Props) {
  const { isEnabled } = await getBusinessFlags();
  const fields = resolveGloveStepsFields(
    business.siteContent?.customFields,
    isEnabled,
  );

  return (
    <div className="glove-body">
      {/* A cleared steps heading would leave the page without an h1. */}
      {fields.heading ? null : <h1 className="sr-only">{page.title}</h1>}
      <GloveSteps
        fields={fields}
        showStepButtons
        headingAs={fields.heading ? "h1" : "h2"}
        sectionAttrs={sectionGroupAttr("homepage", "steps")}
      />
      {hasProseContent(page.content) ? (
        // No reveal: rich text can embed forms.
        <GloveSection tone="mist" reveal={false}>
          <div className="mx-auto max-w-[860px]">
            <GloveProse content={page.content as unknown} />
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </GloveSection>
      ) : null}
    </div>
  );
}
