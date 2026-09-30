import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";

type NoiseGuaranteeSectionProps = {
  /** Small label above the heading; blank hides it. */
  overline: string;
  heading: string;
  headingAccent: string;
  body?: string;
  image?: string;
  /** Initials painted on the striped panel when there's no image. */
  monogram: string;
  /** Short label shown as a corner stamp on the image. Leave undefined to hide. */
  stamp?: string;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

export function NoiseGuaranteeSection({
  overline,
  heading,
  headingAccent,
  body,
  image,
  stamp,
  monogram,
  sectionAttrs,
}: NoiseGuaranteeSectionProps) {
  return (
    <section className="px-7 py-16" {...sectionAttrs}>
      <FadeIn className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
        {/* Text side */}
        <div>
          {overline ? (
            <p
              className="mb-6 font-mono text-[9.5px] tracking-[.28em] uppercase"
              style={{ color: "var(--vn-steel)" }}
              {...fieldAttr("noise.homepage-guarantee-overline")}
            >
              {overline}
            </p>
          ) : null}
          <h2
            className="font-serif leading-tight tracking-tight italic"
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            <span {...fieldAttr("noise.homepage-guarantee-heading")}>
              {heading}
            </span>
            <br />
            <span
              style={{ color: "var(--vn-steel)" }}
              {...fieldAttr("noise.homepage-guarantee-headingAccent")}
            >
              {headingAccent}
            </span>
          </h2>

          {body && (
            <p
              className="mt-7 max-w-[46ch] font-sans leading-relaxed"
              style={{
                fontSize: "15px",
                color: "var(--vn-ink-soft)",
                lineHeight: 1.85,
              }}
              {...fieldAttr("noise.homepage-guarantee-quote")}
            >
              {body}
            </p>
          )}
        </div>

        {/* Image side */}
        <div
          className="border-foreground relative overflow-hidden border"
          style={{ aspectRatio: "5/4", background: "var(--vn-steel)" }}
          {...fieldAttr("noise.homepage-guarantee-image")}
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
            /* Placeholder — diagonal stripe pattern */
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: `repeating-linear-gradient(135deg, rgba(255,255,255,.06) 0 12px, transparent 12px 24px), linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
              }}
            >
              <p
                className="font-serif italic select-none"
                style={{
                  fontSize: "clamp(4rem, 10vw, 8rem)",
                  color: "var(--vn-bone)",
                  opacity: 0.12,
                }}
              >
                {monogram}
              </p>
            </div>
          )}

          {/* Corner stamp — only shown when owner sets a value */}
          {stamp && (
            <div
              className="absolute top-4 left-4 px-2 py-1 font-mono text-[9.5px] tracking-[.2em] uppercase"
              style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
              {...fieldAttr("noise.homepage-guarantee-stamp")}
            >
              {stamp}
            </div>
          )}
        </div>
      </FadeIn>
    </section>
  );
}
