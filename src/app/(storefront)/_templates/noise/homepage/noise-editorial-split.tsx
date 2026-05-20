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
    <section className="border-y-2 border-foreground">
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
        {/* Left — ink panel */}
        <FadeIn
          className="flex flex-col justify-center gap-0 px-8 py-20 border-b border-foreground md:border-b-0 md:border-r md:px-16 md:py-24"
          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        >
          <p
            className="font-mono text-[9.5px] tracking-[.28em] uppercase mb-6"
            style={{ opacity: 0.55 }}
          >
            {overline ?? "The Journal"}
          </p>

          <h2
            className="font-serif italic leading-[1.1] tracking-tight"
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
          >
            {heading ?? "On the patience of good cloth."}
          </h2>

          <p
            className="font-sans leading-relaxed mt-6 max-w-[44ch]"
            style={{ fontSize: "14px", opacity: 0.78, lineHeight: 1.8 }}
          >
            {body ??
              "What it means to build a wardrobe slowly — and why the pieces that earn their keep are rarely the loudest ones."}
          </p>

          <Link
            href={ctaHref ?? "/blog"}
            className="font-mono uppercase mt-8 self-start transition-opacity hover:opacity-60"
            style={{
              fontSize: "11px",
              letterSpacing: ".28em",
              borderBottom: "1px solid var(--vn-bone)",
              paddingBottom: "6px",
              color: "var(--vn-bone)",
            }}
          >
            {ctaText ?? "Read the journal"} →
          </Link>
        </FadeIn>

        {/* Right — editorial image */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: "4/3", minHeight: "400px", background: "var(--vn-steel)" }}
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
                style={{ fontSize: "80px", color: "var(--vn-bone)", opacity: 0.2 }}
              >
                J
              </span>
            </div>
          )}

          {/* Corner stamps */}
          <div
            className="absolute left-4 top-4 font-mono text-[9.5px] tracking-[.2em] uppercase px-2 py-1"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            Editorial
          </div>
          <div
            className="absolute right-4 top-4 font-mono text-[9.5px] tracking-[.2em] uppercase px-2 py-1"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            The Journal
          </div>
        </div>
      </div>
    </section>
  );
}
