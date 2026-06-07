"use client";

import { useMemo, useState } from "react";

import type { DefaultBlogPageTemplateProps } from "../../types";
import { blobIncludesQuery, buildBlogSearchBlob } from "~/lib/blog-search";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";
import { SledgeBlogFeaturedCard } from "../shared/sledge-blog-featured-card";
import { SledgeBlogPostCard } from "../shared/sledge-blog-post-card";
import { SledgeBlogSearch } from "../shared/sledge-blog-search";
import {
  SledgeEmptyState,
  SledgePageHeader,
  SledgePageSection,
  SledgePageSubheading,
} from "../shared/sledge-page-layout";

type Props = DefaultBlogPageTemplateProps & {
  customFields?: Record<string, string>;
};

export function SledgeBlogPage({ pages, customFields }: Props) {
  const f = resolveFields(customFields, [
    "sledge.blog-listing-heading",
    "sledge.blog-listing-intro",
  ]);

  const heading = f["sledge.blog-listing-heading"] ?? "Blog";
  const intro =
    f["sledge.blog-listing-intro"] ??
    "News, studio notes, and stories from behind the scenes.";

  const [query, setQuery] = useState("");

  const postsWithBlob = useMemo(
    () => pages.map((p) => ({ post: p, blob: buildBlogSearchBlob(p) })),
    [pages],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return postsWithBlob
      .filter(({ blob }) => blobIncludesQuery(blob, q))
      .map(({ post }) => post);
  }, [query, pages, postsWithBlob]);

  const [featured, ...rest] = filtered;
  const isSearching = query.trim().length > 0;

  return (
    <PageTransition>
      <SledgePageHeader
        eyebrow="Journal"
        title={heading}
        intro={intro}
        sectionAttrs={sectionGroupAttr("blog", "listing")}
      >
        <div className="mt-8">
          <SledgeBlogSearch
            value={query}
            onChange={setQuery}
            resultCount={filtered.length}
          />
        </div>
      </SledgePageHeader>

      {featured && !isSearching ? (
        <SledgePageSection noBottomPadding className="pb-10">
          <FadeIn>
            <SledgeBlogFeaturedCard post={featured} />
          </FadeIn>
        </SledgePageSection>
      ) : null}

      <SledgePageSubheading
        title={isSearching ? "Results" : "All Posts"}
        aside={
          <span className="sl-eyebrow hidden font-sans text-xs tracking-[0.14em] uppercase md:block">
            {filtered.length} {filtered.length === 1 ? "post" : "posts"}
          </span>
        }
      />

      <SledgePageSection>
        {filtered.length === 0 ? (
          <SledgeEmptyState
            bare
            className="py-20"
            message={
              isSearching
                ? `No posts found for "${query}"`
                : "No posts published yet."
            }
          />
        ) : (
          <StaggerContainer
            key={filtered.map((p) => p.id).join("|")}
            className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {(isSearching ? filtered : rest).map((post, i) => (
              <StaggerItem key={post.slug}>
                <SledgeBlogPostCard post={post} index={i} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </SledgePageSection>
    </PageTransition>
  );
}
