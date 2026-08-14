import Image from "next/image";
import Link from "next/link";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type NoiseAboutTeaserProps = {
  heading?: string;
  body?: TiptapJSON | null;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function NoiseAboutTeaser({
  heading,
  body,
  image,
  buttonText,
  buttonLink,
  sectionAttrs,
}: NoiseAboutTeaserProps) {
  return (
    <section className="px-7 py-16" {...sectionAttrs}>
      <FadeIn className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
        {/* Portrait image */}
        <div
          className="border-foreground relative order-2 overflow-hidden border md:order-1"
          style={{ aspectRatio: "4/5", background: "var(--vn-steel)" }}
        >
          {image ? (
            <Image
              src={image}
              alt={heading ?? "The Art of Noise"}
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
              <p
                className="font-serif italic select-none"
                style={{
                  fontSize: "clamp(3rem, 8vw, 6rem)",
                  color: "var(--vn-bone)",
                  opacity: 0.12,
                }}
              >
                VN
              </p>
            </div>
          )}
        </div>

        {/* Text side */}
        <div className="order-1 md:order-2">
          <p
            className="mb-6 font-mono text-[9.5px] tracking-[.28em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            Our Story
          </p>
          <h2
            className="font-serif leading-tight tracking-tight italic"
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
            {...fieldAttr("noise.homepage-about-heading")}
          >
            {heading ?? "The Art of Noise"}
          </h2>

          <div
            className="mt-7 max-w-[46ch] font-sans leading-relaxed"
            style={{
              fontSize: "15px",
              color: "var(--vn-ink-soft)",
              lineHeight: 1.85,
            }}
          >
            {body ? (
              <TiptapRenderer
                content={body}
                className="prose prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.85] prose-p:text-inherit prose-p:mt-0 prose-p:mb-4 prose-a:text-foreground prose-a:underline max-w-none"
              />
            ) : (
              <p>
                Every piece begins in the studio — cut, sewn, and finished by
                hand, with fabrics chosen to last. Fashion that dances, garments
                that fly.
              </p>
            )}
          </div>

          <Link
            href={buttonLink ?? "/about"}
            className="mt-8 inline-block font-mono uppercase transition-opacity hover:opacity-60"
            style={{
              fontSize: "11px",
              letterSpacing: ".28em",
              borderBottom: "1px solid var(--vn-ink)",
              paddingBottom: "6px",
              color: "var(--vn-ink)",
            }}
          >
            <span {...fieldAttr("noise.homepage-about-button-text")}>
              {buttonText ?? "Our Story"}
            </span>{" "}
            →
          </Link>
        </div>
      </FadeIn>
    </section>
  );
}
