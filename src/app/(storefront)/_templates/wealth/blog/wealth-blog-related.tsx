import type { DefaultBlogPostPageTemplateProps } from "../../types";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";
import { WealthBlogCard } from "./wealth-blog-card";

type Props = {
  posts: DefaultBlogPostPageTemplateProps["relatedPosts"];
  currentSlug: string;
  /** The blog index heading (`wealth.blog.heading`), so the band names the blog. */
  blogName: string;
};

/** Related posts at the foot of a blog post: up to 3 post cards on a surface band. */
export function WealthBlogRelated({ posts, currentSlug, blogName }: Props) {
  const others = posts.filter((p) => p.slug !== currentSlug).slice(0, 3);

  if (others.length === 0) return null;

  return (
    <WealthBlock
      tone="surface"
      aria-labelledby="wealth-blog-related-title"
      className="wealth-blog-related"
    >
      <WealthReveal
        threshold={0}
        className="wealth-section-head wealth-section-head--split"
      >
        <h2 id="wealth-blog-related-title" className="wealth-h2">
          {blogName ? `More from ${blogName}` : "More news"}
        </h2>
        <WealthArrowLink href="/blog">All news</WealthArrowLink>
      </WealthReveal>

      <WealthRevealGroup threshold={0} className="wealth-posts">
        {others.map((post, i) => (
          <WealthBlogCard
            key={post.slug}
            post={post}
            index={i}
            excerptLength={120}
          />
        ))}
      </WealthRevealGroup>
    </WealthBlock>
  );
}
