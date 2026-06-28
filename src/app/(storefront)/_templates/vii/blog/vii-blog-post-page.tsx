import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";
import { ViiBlogPostCta } from "./vii-blog-post-cta";
import { ViiBlogPostHero } from "./vii-blog-post-hero";
import { ViiBlogPostMasthead } from "./vii-blog-post-masthead";
import { ViiBlogRelated } from "./vii-blog-related";

type Props = DefaultBlogPostPageTemplateProps & {
  business: {
    name?: string | null;
    siteContent?: { customFields?: unknown; logoUrl?: string | null } | null;
    phoneNumber?: string | null;
    supportEmail?: string | null;
  };
  customFields?: Record<string, string>;
};

export function ViiBlogPostPage({
  page,
  relatedPosts,
  business,
  customFields,
}: Props) {
  // Prefer the route-level customFields (already cast); fall back to business.
  const fields =
    customFields ??
    (business.siteContent?.customFields as Record<string, string> | undefined);

  const f = resolveFields(fields, [
    "vii.blog.cta-enabled",
    "vii.blog.cta-overline",
    "vii.blog.cta-heading",
    "vii.blog.cta-body",
    "vii.blog.cta-button-text",
    "vii.blog.cta-button-link",
  ]);

  // Lead paragraph: only when the author wrote an excerpt. Deriving from the
  // body here would just duplicate the article's opening paragraph.
  const lead = page.excerpt?.trim() ?? "";

  // Closing CTA — owner-configurable via template fields.
  const ctaEnabled = (f["vii.blog.cta-enabled"] ?? "true") !== "false";
  const ctaOverline = (f["vii.blog.cta-overline"] ?? "").trim() || "The Studio";
  const ctaHeading = (f["vii.blog.cta-heading"] ?? "").trim() || "Come see us";
  const ctaBody =
    (f["vii.blog.cta-body"] ?? "").trim() ||
    "Book a facial or reach out — we'd love to help you find your glow.";
  const ctaButtonText =
    (f["vii.blog.cta-button-text"] ?? "").trim() || "Book a visit";
  const ctaButtonLink =
    (f["vii.blog.cta-button-link"] ?? "").trim() || "/contact";

  // Branch: image hero vs. cream type-led masthead.
  const hasCover = !!page.image?.trim();

  return (
    <PageTransition>
      {/* 1. Hero — image band when a cover is set; cream masthead otherwise */}
      {hasCover ? (
        <ViiBlogPostHero
          image={page.image!}
          title={page.title}
          createdAt={page.createdAt}
        />
      ) : (
        <ViiBlogPostMasthead
          title={page.title}
          createdAt={page.createdAt}
          excerpt={lead}
        />
      )}

      {/* 2. Intro lead — serif-italic excerpt band; image path only.
          The cream masthead already shows the excerpt, so suppress it there
          to avoid stacked-cream duplication. */}
      {hasCover && lead && (
        <div
          style={{
            background: "var(--vii-cream)",
            padding:
              "clamp(48px, 7vw, 80px) clamp(24px, 6vw, 96px) clamp(32px, 4vw, 56px)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              fontSize: "clamp(19px, 2.2vw, 26px)",
              lineHeight: 1.55,
              color: "var(--vii-navy)",
              maxWidth: 720,
              margin: "0 auto",
              textAlign: "center",
              textWrap: "balance",
            }}
          >
            {lead}
          </p>
        </div>
      )}

      {/* 3. Article body — TiptapRenderer inside .vii-prose for editorial styling */}
      <article
        aria-label={page.title}
        style={{
          background: "var(--vii-cream)",
          padding:
            hasCover && lead
              ? "0 clamp(24px, 6vw, 96px) clamp(48px, 7vw, 80px)"
              : "clamp(48px, 7vw, 80px) clamp(24px, 6vw, 96px) clamp(48px, 7vw, 80px)",
        }}
      >
        <div
          className="vii-prose max-w-7xl"
          style={{
            margin: "0 auto",
          }}
        >
          <TiptapRenderer content={page.content as TiptapJSON} />
        </div>
      </article>

      {/* 4. Related posts grid */}
      <ViiBlogRelated
        posts={relatedPosts}
        currentSlug={page.slug}
        logoUrl={business.siteContent?.logoUrl ?? undefined}
        businessName={business.name ?? undefined}
      />

      {/* 5. Closing CTA — light cream sign-off, no heavy navy band */}
      {ctaEnabled && (
        <ViiBlogPostCta
          overline={ctaOverline}
          heading={ctaHeading}
          body={ctaBody}
          buttonText={ctaButtonText}
          buttonLink={ctaButtonLink}
        />
      )}
    </PageTransition>
  );
}
