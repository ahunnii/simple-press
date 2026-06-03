import Image from "next/image";

import { FadeIn } from "~/components/page-animations";

type NoiseGuaranteeSectionProps = {
  overline?: string;
  heading?: string;
  headingAccent?: string;
  body?: string;
  image?: string;
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
  sectionAttrs,
}: NoiseGuaranteeSectionProps) {
  return (
    <section className="px-7 py-16" {...sectionAttrs}>
      <FadeIn className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 md:grid-cols-2 md:gap-24">
        {/* Text side */}
        <div>
          <p
            className="mb-6 font-mono text-[9.5px] tracking-[.28em] uppercase"
            style={{ color: "var(--vn-steel)" }}
          >
            {overline ?? "Our Guarantee"}
          </p>
          <h2
            className="font-serif leading-tight tracking-tight italic"
            style={{
              fontSize: "clamp(2.2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {heading ?? "Thoughtfully made."}
            <br />
            <span style={{ color: "var(--vn-steel)" }}>
              {headingAccent ?? "Responsibly backed."}
            </span>
          </h2>

          <p
            className="mt-7 max-w-[46ch] font-sans leading-relaxed"
            style={{
              fontSize: "15px",
              color: "var(--vn-ink-soft)",
              lineHeight: 1.85,
            }}
          >
            {body ??
              "If a piece doesn't fit, doesn't last, or doesn't feel right — we'll make it right. Free returns within 60 days, and a lifetime repair program for every garment we make."}
          </p>
        </div>

        {/* Image side */}
        <div
          className="border-foreground relative overflow-hidden border"
          style={{ aspectRatio: "5/4", background: "var(--vn-steel)" }}
        >
          {image ? (
            <Image
              src={image}
              alt="Guarantee"
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
                VN
              </p>
            </div>
          )}

          {/* Corner stamp — only shown when owner sets a value */}
          {stamp && (
            <div
              className="absolute top-4 left-4 px-2 py-1 font-mono text-[9.5px] tracking-[.2em] uppercase"
              style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
            >
              {stamp}
            </div>
          )}
        </div>
      </FadeIn>
    </section>
  );
}
