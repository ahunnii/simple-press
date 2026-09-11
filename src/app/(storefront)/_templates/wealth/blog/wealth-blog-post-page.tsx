import type { DefaultBlogPostPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

import { resolveFields } from "..";
import { WealthLink } from "../shared/wealth-link";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthBlogPostCta } from "./wealth-blog-post-cta";
import { WealthBlogPostHero } from "./wealth-blog-post-hero";
import { WealthBlogPostMasthead } from "./wealth-blog-post-masthead";
import { WealthBlogRelated } from "./wealth-blog-related";

type Props = DefaultBlogPostPageTemplateProps & {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  customFields?: Record<string, string>;
};

// Tailwind typography (`prose`) modifiers mapped onto wealth tokens — italic
// PT Sans H2s, border-b primary links, Titillium body. Inline (not a
// `.wealth-prose` globals.css class, unlike vii's `.vii-prose`) because
// globals.css is off-limits for this agent; see `vii-generic-page.tsx` for
// the same inline-modifier approach.
const PROSE_CLASSNAME =
  "prose w-full max-w-none " +
  "prose-headings:[font-family:var(--font-wealth-sub)] prose-headings:italic prose-headings:font-normal prose-headings:text-[var(--wealth-ink)] " +
  "prose-h2:text-[21px] prose-h2:leading-[1.4] prose-h2:tracking-[0.21px] prose-h2:mt-[calc(var(--wealth-rhythm)*2)] prose-h2:mb-[var(--wealth-rhythm)] " +
  "prose-h3:text-[19px] prose-h3:mt-[var(--wealth-rhythm)] prose-h3:mb-3 " +
  "prose-p:[font-family:var(--font-wealth-body)] prose-p:text-[17px] prose-p:leading-[25.5px] prose-p:text-[var(--wealth-ink)] " +
  "prose-li:[font-family:var(--font-wealth-body)] prose-li:text-[17px] prose-li:leading-[25.5px] prose-li:text-[var(--wealth-ink)] " +
  "prose-a:text-[var(--wealth-primary)] prose-a:no-underline prose-a:border-b prose-a:border-[var(--wealth-primary)] " +
  "prose-strong:font-semibold prose-strong:text-[var(--wealth-ink)] " +
  "prose-blockquote:text-[var(--wealth-ink)] prose-blockquote:border-[var(--wealth-primary)] " +
  "prose-hr:border-[var(--wealth-surface-2)] " +
  "prose-img:rounded-none prose-th:text-[var(--wealth-ink)] prose-th:border-[var(--wealth-surface-2)] prose-td:border-[var(--wealth-surface-2)]";

export function WealthBlogPostPage({
  page,
  relatedPosts,
  business,
  customFields,
}: Props) {
  const fields =
    customFields ??
    (business.siteContent?.customFields as Record<string, string> | undefined);

  const f = resolveFields(fields, [
    "wealth.blog.cta-enabled",
    "wealth.blog.cta-overline",
    "wealth.blog.cta-heading",
    "wealth.blog.cta-body",
    "wealth.blog.cta-button-text",
    "wealth.blog.cta-button-link",
  ]);

  const ctaEnabled = ((f["wealth.blog.cta-enabled"] ?? "").trim() || "true") !== "false";
  const ctaOverline = (f["wealth.blog.cta-overline"] ?? "").trim() || "Get Involved";
  const ctaHeading =
    (f["wealth.blog.cta-heading"] ?? "").trim() || "Let's build wealth together.";
  const ctaBody =
    (f["wealth.blog.cta-body"] ?? "").trim() ||
    "Reach out to learn about financing, membership, and partnership with DCWF.";
  const ctaButtonText = (f["wealth.blog.cta-button-text"] ?? "").trim() || "Contact Us";
  const ctaButtonLink = (f["wealth.blog.cta-button-link"] ?? "").trim() || "/contact";

  const lead = page.excerpt?.trim() ?? "";
  const hasCover = !!page.image?.trim();

  return (
    <>
      {hasCover ? (
        <WealthBlogPostHero image={page.image!} title={page.title} createdAt={page.createdAt} />
      ) : (
        <WealthBlogPostMasthead title={page.title} createdAt={page.createdAt} excerpt={lead} />
      )}

      {/* Separate lead paragraph — image-hero path only, so the excerpt never
          appears twice (the masthead path inlines it directly instead). */}
      {hasCover && lead && (
        <div
          style={{
            background: "var(--wealth-paper)",
            padding:
              "calc(var(--wealth-rhythm) * 1.5) var(--wealth-gutter) calc(var(--wealth-rhythm) * 1.5)",
          }}
        >
          <p
            className="mx-auto text-center"
            style={{
              fontFamily: "var(--font-wealth-sub)",
              fontStyle: "italic",
              fontSize: 21,
              lineHeight: 1.5,
              letterSpacing: "0.21px",
              color: "var(--wealth-ink)",
              maxWidth: 720,
            }}
          >
            {lead}
          </p>
        </div>
      )}

      <article
        aria-label={page.title}
        style={{
          background: "var(--wealth-paper)",
          padding: `${hasCover && lead ? 0 : "calc(var(--wealth-rhythm) * 1.5)"} var(--wealth-gutter) calc(var(--wealth-rhythm) * 2)`,
        }}
      >
        <WealthReveal>
          <div className="mx-auto" style={{ maxWidth: 760 }}>
            <TiptapRenderer content={page.content as TiptapJSON} className={PROSE_CLASSNAME} />
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </WealthReveal>
      </article>

      <WealthBlogRelated posts={relatedPosts} currentSlug={page.slug} />

      {ctaEnabled && (
        <WealthBlogPostCta
          overline={ctaOverline}
          heading={ctaHeading}
          body={ctaBody}
          buttonText={ctaButtonText}
          buttonLink={ctaButtonLink}
        />
      )}

      <div
        className="text-center"
        style={{
          background: "var(--wealth-paper)",
          padding: "0 var(--wealth-gutter) calc(var(--wealth-rhythm) * 2)",
        }}
      >
        <WealthLink href="/blog">← Back to News + Notes</WealthLink>
      </div>
    </>
  );
}
