import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { routeEnabled, routeFlags } from "~/lib/features/route-flags";
import { isSectionVisible } from "~/lib/sp-meta";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthBlogPostCta } from "./wealth-blog-post-cta";
import { WealthBlogPostHero } from "./wealth-blog-post-hero";
import { WealthBlogRelated } from "./wealth-blog-related";

type Props = DefaultBlogPostPageTemplateProps & {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

/**
 * BlogPostPage — redesign pass 2 (2026-10-12): split hero (cover photo, else
 * full-width forest panel), the post body in `.wealth-prose` (the GenericPage
 * prose adapter), the forest CTA band (`blog.post`), then related posts on a
 * surface band. Server component.
 */
export async function WealthBlogPostPage({
  page,
  relatedPosts,
  business,
  customFields,
}: Props) {
  const fields =
    customFields ??
    (business.siteContent?.customFields as Record<string, string> | undefined);

  const f = resolveFields(fields, [
    "wealth.blog.heading",
    "wealth.blog.cta-enabled",
    "wealth.blog.cta-overline",
    "wealth.blog.cta-heading",
    "wealth.blog.cta-body",
    "wealth.blog.cta-button-text",
    "wealth.blog.cta-button-link",
  ]);

  const showCta =
    ((f["wealth.blog.cta-enabled"] ?? "").trim() || "true") !== "false" &&
    isSectionVisible(fields, "wealth", "blog.post");
  const ctaOverline =
    (f["wealth.blog.cta-overline"] ?? "").trim() || "Get Involved";
  const ctaHeading =
    (f["wealth.blog.cta-heading"] ?? "").trim() ||
    "Let's build wealth together.";
  const ctaBody =
    (f["wealth.blog.cta-body"] ?? "").trim() ||
    "Reach out to learn about financing, membership, and partnership with DCWF.";
  const ctaButtonText =
    (f["wealth.blog.cta-button-text"] ?? "").trim() || "Contact Us";
  const ctaHref = (f["wealth.blog.cta-button-link"] ?? "").trim() || "/contact";

  // An owner-typed link to a switched-off feature would 404: drop the button.
  // Flags are only fetched when the link points at a gated route.
  const gated = showCta && routeFlags(ctaHref).length > 0;
  const isEnabled = gated ? (await getBusinessFlags()).isEnabled : () => true;
  const ctaLink = routeEnabled(ctaHref, isEnabled) ? ctaHref : "";

  return (
    <>
      <WealthBlogPostHero
        image={page.image?.trim() ? page.image : null}
        title={page.title}
        createdAt={page.createdAt}
        excerpt={page.excerpt?.trim() ?? ""}
      />

      <WealthBlock
        as="article"
        container="prose"
        aria-labelledby="wealth-blog-post-title"
        className="wealth-blog-body"
      >
        <WealthReveal threshold={0}>
          <TiptapRenderer
            content={page.content as TiptapJSON}
            className="wealth-prose"
          />
          <PlatformPolicyNotice slug={page.slug} />
        </WealthReveal>
      </WealthBlock>

      {showCta ? (
        <WealthBlogPostCta
          overline={ctaOverline}
          heading={ctaHeading}
          body={ctaBody}
          buttonText={ctaButtonText}
          buttonLink={ctaLink}
        />
      ) : null}

      <WealthBlogRelated
        posts={relatedPosts}
        currentSlug={page.slug}
        blogName={(f["wealth.blog.heading"] ?? "").trim()}
      />
    </>
  );
}
