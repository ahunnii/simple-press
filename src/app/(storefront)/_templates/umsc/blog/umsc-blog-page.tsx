import type { DefaultBlogPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";

// Default's resolver for the `default.blog.*` keys: umsc rendered Default's
// blog until 2026-09-28, so any saved copy lives there, and only Default's
// field map knows their `defaultValue`s.
import { resolveFields as resolveDefaultFields } from "../../default";
import { UmscGatedLink } from "../generic/umsc-gated-link";
import { UmscEmptyState } from "../generic/umsc-page-kit";
import { nonBlank } from "../shared/umsc-non-blank";
import { UmscPageHero } from "../shared/umsc-page-hero";
import { UmscSection } from "../shared/umsc-section";
import { resolveUmscBlogFields } from "./index";
import { UmscBlogList } from "./umsc-blog-list";

type Props = DefaultBlogPageTemplateProps & {
  /** `blog/page.tsx` passes these beyond the nominal props (playbook note). */
  customFields?: Record<string, string>;
  business?: { siteContent?: { customFields?: unknown } | null } | null;
};

/**
 * `/blog` — umsc's blog index on the generic page base (parity PF22):
 *
 * - `blog.header`: the black `UmscPageHero` — Default's listing title + intro
 *   (`default.blog.*`, read through Default's resolver).
 * - `blog.list`: on the shared `UmscSection` container — search, the latest
 *   post as a split lead story, the rest as a card grid (client half in
 *   `UmscBlogList`), or the designed empty state with a flag-gated link.
 */
export function UmscBlogPage({ pages, customFields, business }: Props) {
  const fields = customFields ?? business?.siteContent?.customFields;
  const d = resolveDefaultFields(fields, [
    "default.blog.listing-title",
    "default.blog.listing-intro",
    "default.blog.listing-search-empty",
    "default.blog.listing-more-label",
  ]);
  const f = resolveUmscBlogFields(fields, [
    "umsc.blog.card-link-label",
    "umsc.blog.empty-heading",
    "umsc.blog.empty-body",
    "umsc.blog.empty-link-label",
    "umsc.blog.empty-link-url",
  ]);

  return (
    <PageTransition>
      <UmscPageHero
        heading={nonBlank(d["default.blog.listing-title"]) ?? "Blog"}
        headingFieldKey="default.blog.listing-title"
        lede={d["default.blog.listing-intro"] ?? ""}
        ledeFieldKey="default.blog.listing-intro"
        sectionAttrs={sectionGroupAttr("blog", "header")}
      />

      <UmscSection
        tone="paper"
        aria-label="Posts"
        sectionAttrs={sectionGroupAttr("blog", "list")}
      >
        {pages.length === 0 ? (
          <UmscEmptyState
            heading={
              nonBlank(f["umsc.blog.empty-heading"]) ??
              "Stories are on their way."
            }
            headingFieldKey="umsc.blog.empty-heading"
            body={f["umsc.blog.empty-body"]}
            bodyFieldKey="umsc.blog.empty-body"
          >
            <UmscGatedLink
              href={f["umsc.blog.empty-link-url"] ?? ""}
              label={f["umsc.blog.empty-link-label"] ?? ""}
              labelFieldKey="umsc.blog.empty-link-label"
              variant="link"
            />
          </UmscEmptyState>
        ) : (
          <UmscBlogList
            pages={pages}
            searchEmpty={
              nonBlank(d["default.blog.listing-search-empty"]) ??
              "No posts match your search."
            }
            moreLabel={d["default.blog.listing-more-label"] ?? ""}
            cardLinkLabel={f["umsc.blog.card-link-label"] ?? ""}
          />
        )}
      </UmscSection>
    </PageTransition>
  );
}
