import Image from "next/image";
import Link from "next/link";

import { FadeIn } from "~/components/page-animations";

type NoiseEditorialSplitProps = {
  overline?: string;
  heading?: string;
  body?: string;
  ctaText?: string;
  ctaHref?: string;
  image?: string;
};

export function NoiseEditorialSplit({
  overline,
  heading,
  body,
  ctaText,
  ctaHref,
  image,
}: NoiseEditorialSplitProps) {
  return (
    <section className="border-foreground border-y-2">
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
        {/* Left — ink panel */}
        <FadeIn
          className="border-foreground flex flex-col justify-center gap-0 border-b px-8 py-20 md:border-r md:border-b-0 md:px-16 md:py-24"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <p
            className="mb-6 font-mono text-[9.5px] tracking-[.28em] uppercase"
            style={{ opacity: 0.55 }}
          >
            {overline ?? "Blog"}
          </p>

          <h2
            className="font-serif leading-[1.1] tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
          >
            {heading ?? "The latest and greatest from the shop."}
          </h2>

          <p
            className="mt-6 max-w-[44ch] font-sans leading-relaxed"
            style={{ fontSize: "14px", opacity: 0.78, lineHeight: 1.8 }}
          >
            {body ??
              "Discover the latest arrivals, seasonal collections, and behind-the-scenes insights from the studio."}
          </p>

          <Link
            href={ctaHref ?? "/blog"}
            className="mt-8 self-start font-mono uppercase transition-opacity hover:opacity-60"
            style={{
              fontSize: "11px",
              letterSpacing: ".28em",
              borderBottom: "1px solid var(--vn-bone)",
              paddingBottom: "6px",
              color: "var(--vn-bone)",
            }}
          >
            {ctaText ?? "Read the blog"} →
          </Link>
        </FadeIn>

        {/* Right — editorial image */}
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: "4/3",
            minHeight: "400px",
            background: "var(--vn-steel)",
          }}
        >
          {image ? (
            <Image
              src={image}
              alt={heading ?? "Editorial"}
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
