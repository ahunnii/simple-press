import { formatDate } from "~/lib/utils";

import { WealthH1 } from "../shared/wealth-h1";
import { WealthReveal } from "../shared/wealth-reveal";
import { WealthBlogAccentBar } from "./wealth-blog-accent-bar";

type Props = {
  title: string;
  createdAt: Date;
  /** Inlined here (no separate lead block) so the excerpt isn't duplicated — see wealth-blog-post-page.tsx. */
  excerpt?: string;
};

/**
 * Typographic masthead for posts with no cover image — mono date, Jost
 * title, the orange accent bar, and (unlike the image-hero variant) the
 * post's excerpt inlined directly beneath it so the excerpt isn't shown
 * twice on posts without a photo.
 */
export function WealthBlogPostMasthead({ title, createdAt, excerpt }: Props) {
  return (
    <div
      style={{
        background: "var(--wealth-paper)",
        borderBottom: "1px solid var(--wealth-surface-2)",
        padding:
          "calc(var(--wealth-rhythm) * 2) var(--wealth-gutter)",
      }}
    >
      <WealthReveal>
        <div className="mx-auto" style={{ maxWidth: 760 }}>
          <time
            dateTime={new Date(createdAt).toISOString()}
            style={{
              display: "block",
              fontFamily: "var(--font-wealth-mono)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "1.69px",
              textTransform: "uppercase",
              color: "var(--wealth-eyebrow)",
              marginBottom: 20,
            }}
          >
            {formatDate(createdAt)}
          </time>

          {/* `.wealth-h1`'s font-size/line-height/margin are set via an
              unlayered rule (deliberately, so it beats Tailwind utilities) —
              a `className` size override here would be silently dropped, so
              this renders at the shared page-title size rather than larger. */}
          <WealthH1>{title}</WealthH1>

          <WealthBlogAccentBar style={{ marginTop: 24 }} />

          {excerpt && (
            <p
              style={{
                fontFamily: "var(--font-wealth-sub)",
                fontStyle: "italic",
                fontSize: 21,
                lineHeight: 1.5,
                letterSpacing: "0.21px",
                color: "var(--wealth-ink)",
                marginTop: 24,
                maxWidth: "56ch",
              }}
            >
              {excerpt}
            </p>
          )}
        </div>
      </WealthReveal>
    </div>
  );
}
