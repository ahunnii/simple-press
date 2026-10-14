import type { DefaultBlogPageTemplateProps } from "../../types";
import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { resolveFields } from "..";
import { WealthBlock } from "../shared/wealth-block";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthSplitHero } from "../shared/wealth-split-hero";
import { WealthBlogClient } from "./wealth-blog-client";

type Props = {
  pages: DefaultBlogPageTemplateProps["pages"];
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

/**
 * BlogPage — redesign pass 2 (2026-10-12): forest hero panel (optional photo
 * split) with the H1 + intro excerpt, then the searchable post list (newest
 * post featured, the rest a 3-up grid), or a designed empty state on a
 * surface block. The hero and the empty block are both `blog.index`.
 */
export function WealthBlogPage({ pages, business, customFields }: Props) {
  const fields = customFields ?? business.siteContent?.customFields;

  const f = resolveFields(fields, [
    "wealth.blog.heading",
    "wealth.blog.intro",
    "wealth.blog.hero-image",
    "wealth.blog.hero-image-alt",
    "wealth.blog.empty-heading",
    "wealth.blog.empty-body",
    "wealth.blog.empty-cta-label",
  ]);

  const heading = (f["wealth.blog.heading"] ?? "").trim() || "News + Notes";
  const intro = (f["wealth.blog.intro"] ?? "").trim();
  const heroImage = (f["wealth.blog.hero-image"] ?? "").trim();
  const heroAlt = (f["wealth.blog.hero-image-alt"] ?? "").trim();
  const emptyHeading =
    (f["wealth.blog.empty-heading"] ?? "").trim() || "No posts yet.";
  const emptyBody =
    (f["wealth.blog.empty-body"] ?? "").trim() ||
    "Meanwhile, find DCWF in the news on our homepage.";
  const emptyCta =
    (f["wealth.blog.empty-cta-label"] ?? "").trim() || "Back to the homepage";

  return (
    <>
      <WealthSplitHero
        ratio="sixty"
        image={heroImage || null}
        imageAlt={heroAlt}
        aria-labelledby="wealth-blog-title"
        {...sectionGroupAttr("blog", "index")}
      >
        <WealthReveal>
          <h1
            id="wealth-blog-title"
            className="wealth-hero__title"
            {...fieldAttr("wealth.blog.heading")}
          >
            {heading}
          </h1>
        </WealthReveal>
        <WealthReveal delay={1}>
          <hr className="wealth-hero__rule" />
        </WealthReveal>
        {intro ? (
          <WealthReveal delay={2}>
            <p
              className="wealth-hero__excerpt"
              {...fieldAttr("wealth.blog.intro")}
            >
              {intro}
            </p>
          </WealthReveal>
        ) : null}
      </WealthSplitHero>

      {pages.length === 0 ? (
        <WealthBlock
          tone="surface"
          container="narrow"
          aria-labelledby="wealth-blog-empty-title"
          className="wealth-blog-empty"
          {...sectionGroupAttr("blog", "index")}
        >
          <WealthReveal className="wealth-center wealth-stack">
            <h2
              id="wealth-blog-empty-title"
              className="wealth-h2"
              {...fieldAttr("wealth.blog.empty-heading")}
            >
              {emptyHeading}
            </h2>
            <p className="wealth-lead" {...fieldAttr("wealth.blog.empty-body")}>
              {emptyBody}
            </p>
            <div className="wealth-btn-row wealth-btn-row--center">
              <WealthLedgeButton href="/">
                <span {...fieldAttr("wealth.blog.empty-cta-label")}>
                  {emptyCta}
                </span>
              </WealthLedgeButton>
            </div>
          </WealthReveal>
        </WealthBlock>
      ) : (
        <WealthBlogClient pages={pages} />
      )}
    </>
  );
}
