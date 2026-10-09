import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { navHrefOffFlag } from "~/app/(storefront)/_components/nav";

import { resolveFields } from "..";
import { GloveEmptyState } from "../generic/glove-empty-state";
import { GloveGeneralLayout } from "../generic/glove-general-layout";
import { GloveSection } from "../shared";
import { GloveBlogGrid } from "./glove-blog-grid";

type Props = DefaultBlogPageTemplateProps & {
  business?: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "glove.blog.header-title",
  "glove.blog.header-subtitle",
  "glove.blog.listing-read-more",
  "glove.blog.listing-load-more",
  "glove.blog.listing-search-empty",
  "glove.blog.listing-empty-heading",
  "glove.blog.listing-empty-body",
  "glove.blog.listing-empty-cta-label",
  "glove.blog.listing-empty-cta-link",
];

/**
 * `/blog` — banner title band, search + 3-col card grid, crawlable
 * "load more", designed empty state. The route passes `pages`, `business`
 * and `customFields` (`DefaultBlogPageTemplateProps` only declares `pages`).
 * Server component: resolves fields, hands the interactive grid to a client
 * child.
 */
export async function GloveBlogPage({ pages, business, customFields }: Props) {
  const fields = customFields ?? business?.siteContent?.customFields;
  const f = resolveFields(fields, FIELD_KEYS);
  const get = (key: string) => f[key] ?? "";

  // B2.5: the empty-state button hides (never swaps destination) when its
  // link points at a feature that is switched off.
  const { isEnabled } = await getBusinessFlags();
  const ctaTarget = get("glove.blog.listing-empty-cta-link").trim();
  const ctaFlag = ctaTarget ? navHrefOffFlag(ctaTarget, isEnabled) : null;
  const ctaHref = ctaFlag === null || isEnabled(ctaFlag) ? ctaTarget : "";

  const title = get("glove.blog.header-title").trim() || "Blog";

  return (
    <GloveGeneralLayout
      bandVariant="banner"
      title={title}
      titleFieldKey="glove.blog.header-title"
      subtitle={get("glove.blog.header-subtitle")}
      subtitleFieldKey="glove.blog.header-subtitle"
      breadcrumb={[{ label: "Home", href: "/" }, { label: title }]}
      sectionAttrs={sectionGroupAttr("blog", "header")}
    >
      <GloveSection
        tone="paper"
        aria-label="Posts"
        sectionAttrs={sectionGroupAttr("blog", "listing")}
        // The grid holds the search form and its own stagger group.
        reveal={false}
      >
        {pages.length === 0 ? (
          <GloveEmptyState
            heading={get("glove.blog.listing-empty-heading")}
            headingFieldKey="glove.blog.listing-empty-heading"
            body={get("glove.blog.listing-empty-body")}
            bodyFieldKey="glove.blog.listing-empty-body"
            cta={{
              label: get("glove.blog.listing-empty-cta-label"),
              href: ctaHref,
              fieldKey: "glove.blog.listing-empty-cta-label",
            }}
          />
        ) : (
          <GloveBlogGrid
            posts={pages}
            readMoreLabel={get("glove.blog.listing-read-more")}
            loadMoreLabel={get("glove.blog.listing-load-more")}
            searchEmptyMessage={get("glove.blog.listing-search-empty")}
          />
        )}
      </GloveSection>
    </GloveGeneralLayout>
  );
}
