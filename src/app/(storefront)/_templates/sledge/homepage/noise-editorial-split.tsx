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
        <FadeIn className="border-foreground flex flex-col justify-center gap-0 border-b bg-[var(--sl-ink)] px-8 py-20 text-[var(--sl-cream)] md:border-r md:border-b-0 md:px-16 md:py-24">
          <p className="mb-6 font-mono text-[9.5px] tracking-[.28em] uppercase opacity-55">
            {overline ?? "Blog"}
          </p>

          <h2 className="font-serif text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.02em] italic">
            {heading ?? "The latest and greatest from the shop."}
          </h2>

          <p className="mt-6 max-w-[44ch] font-sans text-sm leading-[1.8] opacity-78">
            {body ??
              "Discover the latest arrivals, seasonal collections, and behind-the-scenes insights from the studio."}
          </p>

          <Link
            href={ctaHref ?? "/blog"}
            className="mt-8 self-start border-b border-[var(--sl-cream)] pb-1.5 font-mono text-[11px] tracking-[.28em] text-[var(--sl-cream)] uppercase transition-opacity hover:opacity-60"
          >
            {ctaText ?? "Read the blog"} →
          </Link>
        </FadeIn>

        {/* Right — editorial image */}
        <div className="relative aspect-[4/3] min-h-[400px] overflow-hidden bg-[var(--sl-green)]">
          {image ? (
            <Image
              src={image}
              alt={heading ?? "Editorial"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="sledge-card-placeholder absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-[80px] text-[var(--sl-cream)] italic opacity-20 select-none">
                B
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
