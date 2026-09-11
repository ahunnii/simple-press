import Image from "next/image";

import { formatDate } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { WealthBlogAccentBar } from "./wealth-blog-accent-bar";

type Props = {
  image: string;
  title: string;
  createdAt: Date;
};

/**
 * Full-width image band for posts with a cover photo — mono date and Jost
 * title overlaid on a scrim at the foot of the image, orange accent bar
 * beneath the title. The excerpt (if any) is NOT inlined here — it renders
 * as a separate lead paragraph below the hero in wealth-blog-post-page.tsx,
 * matching the no-cover masthead's single-appearance rule.
 */
export function WealthBlogPostHero({ image, title, createdAt }: Props) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "clamp(360px, 48vw, 560px)",
      }}
    >
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: "center 35%" }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--wealth-ink) 78%, transparent) 0%, color-mix(in srgb, var(--wealth-ink) 30%, transparent) 55%, transparent 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        <WealthReveal className="w-full">
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: "var(--wealth-container)",
              padding: "var(--wealth-gutter)",
              paddingBottom: "calc(var(--wealth-rhythm) * 1.5)",
            }}
          >
            <time
              dateTime={new Date(createdAt).toISOString()}
              style={{
                display: "block",
                fontFamily: "var(--font-wealth-mono)",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "1.69px",
                textTransform: "uppercase",
                color: "var(--wealth-paper)",
                marginBottom: 16,
              }}
            >
              {formatDate(createdAt)}
            </time>
            {/* Not the shared WealthH1 — its `.wealth-h1` rule is deliberately
                unlayered so it beats Tailwind utilities regardless of
                specificity, which would swallow a `text-[var(--wealth-paper)]`
                override needed for legibility over a dark photo scrim. */}
            <h1
              style={{
                fontFamily: "var(--font-wealth-display)",
                fontWeight: 500,
                fontSize: "clamp(32px, 5vw, 48px)",
                lineHeight: 1.15,
                letterSpacing: "0.4px",
                color: "var(--wealth-paper)",
                margin: 0,
              }}
            >
              {title}
            </h1>
            <WealthBlogAccentBar style={{ marginTop: 20 }} />
          </div>
        </WealthReveal>
      </div>
    </div>
  );
}
