import { formatDate } from "~/lib/utils";

import { WealthArrowLink } from "../shared/wealth-arrow-link";
import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";

type Props = {
  /** Cover photo; blank → full-width forest panel. */
  image?: string | null;
  title: string;
  createdAt: Date;
  excerpt?: string;
};

/**
 * Post hero (redesign pass 2): split (sixty, photo on the right) when the
 * post has a cover photo, otherwise a full-width forest panel. Mono date
 * eyebrow, Jost H1, sage rule, italic excerpt deck, "« All news" link.
 * Server component; no editor fields live here, so no hotspot attrs.
 *
 * DEVIATION: the eyebrow is the date only — `Page` has no category column.
 */
export function WealthBlogPostHero({
  image,
  title,
  createdAt,
  excerpt,
}: Props) {
  return (
    <WealthSplitHero
      ratio="sixty"
      reverse
      image={image}
      aria-labelledby="wealth-blog-post-title"
      className="wealth-blog-post-hero"
    >
      <WealthReveal>
        <WealthEyebrow as="p">
          <time dateTime={new Date(createdAt).toISOString()}>
            {formatDate(createdAt)}
          </time>
        </WealthEyebrow>
      </WealthReveal>
      <WealthReveal delay={1}>
        <h1 id="wealth-blog-post-title" className="wealth-hero__title">
          {title}
        </h1>
      </WealthReveal>
      <WealthReveal delay={2}>
        <hr className="wealth-hero__rule" />
      </WealthReveal>
      {excerpt ? (
        <WealthReveal delay={3}>
          <p className="wealth-hero__excerpt">{excerpt}</p>
        </WealthReveal>
      ) : null}
      <WealthReveal delay={3}>
        <WealthArrowLink href="/blog" className="wealth-blog-back">
          All news
        </WealthArrowLink>
      </WealthReveal>
    </WealthSplitHero>
  );
}
