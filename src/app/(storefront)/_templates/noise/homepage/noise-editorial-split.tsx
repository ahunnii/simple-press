import Image from "next/image";
import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";

type NoiseEditorialSplitProps = {
  /** Each text prop is a resolved `homepage.blogTeaser` field; blank hides it. */
  overline: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaHref: string;
  /** Blank shows the striped "B" panel. */
  image: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

/**
 * Homepage blog teaser (`homepage.blogTeaser`) — ink text panel beside an
 * editorial image. The caller only renders it while the Blog feature is on.
 */
export function NoiseEditorialSplit({
  overline,
  heading,
  body,
  ctaText,
  ctaHref,
  image,
  sectionAttrs,
}: NoiseEditorialSplitProps) {
  return (
    <section className="border-foreground border-y-2" {...sectionAttrs}>
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
        {/* Left — ink panel */}
        <FadeIn
          className="border-foreground flex flex-col justify-center gap-0 border-b px-8 py-20 md:border-r md:border-b-0 md:px-16 md:py-24"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          {overline ? (
            <p
              className="mb-6 font-mono text-[9.5px] tracking-[.28em] uppercase"
              style={{ opacity: 0.55 }}
              {...fieldAttr("noise.homepage.blog-teaser-overline")}
            >
              {overline}
            </p>
          ) : null}

          {heading ? (
            <h2
              className="font-serif leading-[1.1] tracking-tight italic"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                letterSpacing: "-0.02em",
              }}
              {...fieldAttr("noise.homepage.blog-teaser-heading")}
            >
              {heading}
            </h2>
          ) : null}

          {body ? (
            <p
              className="mt-6 max-w-[44ch] font-sans leading-relaxed"
              style={{ fontSize: "14px", opacity: 0.78, lineHeight: 1.8 }}
              {...fieldAttr("noise.homepage.blog-teaser-body")}
            >
              {body}
            </p>
          ) : null}

          {ctaText ? (
            <Link
              href={ctaHref}
              className="vn-focus-on-dark mt-8 self-start font-mono uppercase transition-opacity hover:opacity-60"
              style={{
                fontSize: "11px",
                letterSpacing: ".28em",
                borderBottom: "1px solid var(--vn-bone)",
                paddingBottom: "6px",
                color: "var(--vn-bone)",
              }}
            >
              <span {...fieldAttr("noise.homepage.blog-teaser-button-text")}>
                {ctaText}
              </span>{" "}
              →
            </Link>
          ) : null}
        </FadeIn>

        {/* Right — editorial image */}
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: "4/3",
            minHeight: "400px",
            background: "var(--vn-steel)",
          }}
          {...fieldAttr("noise.homepage.blog-teaser-image")}
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
              }}
            >
              <span
                aria-hidden="true"
                className="font-serif italic select-none"
                style={{
                  fontSize: "80px",
                  color: "var(--vn-bone)",
                  opacity: 0.2,
                }}
              >
                B
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
