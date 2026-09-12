import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { OliveEmptyState, OliveSection } from "../shared";
import { OliveBlogClient } from "./olive-blog-client";
import { OliveBlogHero } from "./olive-blog-hero";

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

const FIELD_KEYS = [
  "olive.blog.hero-image",
  "olive.blog.hero-heading",
  "olive.blog.hero-subtitle",
  "olive.blog.empty-heading",
  "olive.blog.empty-body",
  "olive.blog.empty-cta-label",
  "olive.blog.empty-cta-link",
  "olive.blog.search-empty-message",
] as const;

/**
 * OliveBlogPage — "The journal" index. The route passes `pages` (already
 * sorted newest-first), `business` and `customFields` (see
 * `src/app/(storefront)/blog/page.tsx`) — `DefaultBlogPageTemplateProps`
 * itself only declares `pages`.
 */
export function OliveBlogPage({ pages, business, customFields }: Props) {
  const fields = customFields ?? business.siteContent?.customFields;
  const f = resolveFields(fields, [...FIELD_KEYS]);

  const emptyCtaLink = (f["olive.blog.empty-cta-link"] ?? "").trim();

  return (
    // The masthead AND its empty/search state are one `blog.hero` field
    // group (design.md's numbering treats the journal index as one section) —
    // `sectionGroupAttr` goes on this single wrapping root so the editor's
    // querySelector-based focus/pulse (see preview-overlay.tsx) always finds
    // exactly one element for "blog.hero", never the first of two siblings.
    <div {...sectionGroupAttr("blog", "hero")}>
      <OliveBlogHero
        image={f["olive.blog.hero-image"] ?? ""}
        heading={f["olive.blog.hero-heading"] ?? ""}
        subtitle={f["olive.blog.hero-subtitle"] ?? ""}
        headingFieldKey="olive.blog.hero-heading"
        subtitleFieldKey="olive.blog.hero-subtitle"
      />

      <OliveSection tone="white">
        {pages.length === 0 ? (
          <OliveEmptyState
            headingAs="h2"
            heading={f["olive.blog.empty-heading"] ?? ""}
            body={f["olive.blog.empty-body"] ?? ""}
            cta={
              emptyCtaLink
                ? {
                    label: f["olive.blog.empty-cta-label"] ?? "",
                    href: emptyCtaLink,
                  }
                : undefined
            }
          />
        ) : (
          <OliveBlogClient
            posts={pages}
            searchEmptyMessage={f["olive.blog.search-empty-message"] ?? ""}
          />
        )}
      </OliveSection>
    </div>
  );
}
