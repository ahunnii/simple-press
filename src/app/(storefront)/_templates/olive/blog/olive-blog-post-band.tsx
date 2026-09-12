import type { OliveBlogPost } from "./olive-blog-card";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import {
  OliveButton,
  OliveRevealGroup,
  OliveSection,
  OliveSectionHeading,
} from "../shared";
import { OliveBlogCard } from "./olive-blog-card";

type Props = {
  relatedPosts: OliveBlogPost[];
  currentSlug: string;
  relatedHeading: string;
  ctaHeading: string;
  ctaBody: string;
  ctaButtonText: string;
  ctaButtonLink: string;
};

const RELATED_HEADING_KEY = "olive.blog.post-related-heading";
const CTA_HEADING_KEY = "olive.blog.post-cta-heading";
const CTA_BODY_KEY = "olive.blog.post-cta-body";
const CTA_BUTTON_TEXT_KEY = "olive.blog.post-cta-button-text";

/**
 * OliveBlogPostBand — the `blog.post` section rendered at the end of every
 * post: up to 4 related cards in a 2-up grid, then the closing CTA card on
 * `--olive-sage-tint`. Gated by `isSectionVisible(customFields, "olive",
 * "blog.post")` in the server page — this component itself doesn't check
 * visibility, it just renders the section when asked to.
 */
export function OliveBlogPostBand({
  relatedPosts,
  currentSlug,
  relatedHeading,
  ctaHeading,
  ctaBody,
  ctaButtonText,
  ctaButtonLink,
}: Props) {
  const others = relatedPosts.filter((p) => p.slug !== currentSlug).slice(0, 4);

  return (
    <OliveSection tone="white" {...sectionGroupAttr("blog", "post")}>
      {others.length > 0 ? (
        <div style={{ marginBottom: "3rem" }}>
          <OliveSectionHeading
            as="h2"
            heading={relatedHeading}
            headingFieldKey={RELATED_HEADING_KEY}
          />
          <OliveRevealGroup
            fan
            className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2"
          >
            {others.map((post, i) => (
              <OliveBlogCard
                key={post.slug}
                post={post}
                headingLevel="h3"
                revealIndex={i}
              />
            ))}
          </OliveRevealGroup>
        </div>
      ) : null}

      <div
        className="olive-card flex flex-col items-start gap-3 p-8"
        style={{ backgroundColor: "var(--olive-sage-tint)" }}
      >
        <h2 className="olive-h2" {...fieldAttr(CTA_HEADING_KEY)}>
          {ctaHeading}
        </h2>
        {ctaBody ? (
          <p
            className="olive-caption"
            {...fieldAttr(CTA_BODY_KEY)}
            style={{ maxWidth: "55ch" }}
          >
            {ctaBody}
          </p>
        ) : null}
        <OliveButton
          variant="primary"
          href={ctaButtonLink}
          data-sp-field={CTA_BUTTON_TEXT_KEY}
        >
          {ctaButtonText}
        </OliveButton>
      </div>
    </OliveSection>
  );
}
