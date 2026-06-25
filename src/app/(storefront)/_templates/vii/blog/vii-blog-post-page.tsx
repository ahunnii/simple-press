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
    siteContent?: { customFields?: unknown } | null;
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
    "vii.homepage.contact-image",
    "vii.homepage.contact-heading",
    "vii.homepage.contact-subheading",
    "vii.homepage.contact-body",
  ]);

  // Lead paragraph: only when the author wrote an excerpt. Deriving from the
  // body here would just duplicate the article's opening paragraph.
  const lead = page.excerpt?.trim() ?? "";

  // Closing CTA reuses the homepage contact content; fall back to blog-friendly
  // defaults so the post never ends on an empty band.
  const ctaHeading =
    (f["vii.homepage.contact-heading"] ?? "").trim() || "Come see us";
  const ctaSubheading =
    (f["vii.homepage.contact-subheading"] ?? "").trim() || "The Studio";
  const ctaBody =
    (f["vii.homepage.contact-body"] ?? "").trim() ||
    "Book a facial or reach out — we'd love to help you find your glow.";

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
      <ViiBlogRelated posts={relatedPosts} currentSlug={page.slug} />

      {/* 5. Closing CTA — light cream sign-off, no heavy navy band */}
      <ViiBlogPostCta
        overline={ctaSubheading}
        heading={ctaHeading}
        body={ctaBody}
      />
    </PageTransition>
  );
}
