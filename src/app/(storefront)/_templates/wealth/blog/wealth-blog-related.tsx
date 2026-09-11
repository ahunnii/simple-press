import type { DefaultBlogPostPageTemplateProps } from "../../types";

import { WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthSectionHeading } from "../shared/wealth-section-heading";
import { WealthBlogCard } from "./wealth-blog-card";
import { WealthBlogReadLink } from "./wealth-blog-read-link";

type Props = {
  posts: DefaultBlogPostPageTemplateProps["relatedPosts"];
  currentSlug: string;
};

/** Related posts at the foot of a blog post — the same bar-card language as the index grid, capped to 3. */
export function WealthBlogRelated({ posts, currentSlug }: Props) {
  const others = posts.filter((p) => p.slug !== currentSlug).slice(0, 3);

  if (others.length === 0) return null;

  return (
    <div
      style={{
        background: "var(--wealth-surface)",
        padding: "calc(var(--wealth-rhythm) * 2) var(--wealth-gutter)",
      }}
    >
      <div className="mx-auto" style={{ maxWidth: "var(--wealth-container)" }}>
        <div
          className="flex flex-wrap items-end justify-between gap-4"
          style={{ marginBottom: "calc(var(--wealth-rhythm) * 1.5)" }}
        >
          <WealthSectionHeading>More from News + Notes</WealthSectionHeading>
          <WealthBlogReadLink as="link" href="/blog">
            All posts
          </WealthBlogReadLink>
        </div>

        <WealthRevealGroup className="grid grid-cols-1 gap-x-[var(--wealth-gutter)] gap-y-[calc(var(--wealth-rhythm)*1.5)] sm:grid-cols-3">
          {others.map((post, i) => (
            <WealthBlogCard key={post.slug} post={post} index={i} excerptLength={120} />
          ))}
        </WealthRevealGroup>
      </div>
    </div>
  );
}
