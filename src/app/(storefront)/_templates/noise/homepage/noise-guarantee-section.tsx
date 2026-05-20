import Image from "next/image";

import { FadeIn } from "~/components/page-animations";

type Stat = { value: string; label: string };

const DEFAULT_STATS: Stat[] = [
  { value: "60d", label: "Free returns" },
  { value: "∞", label: "Lifetime repair" },
  { value: "14", label: "Mill partners" },
];

type NoiseGuaranteeSectionProps = {
  overline?: string;
  heading?: string;
  headingAccent?: string;
  body?: string;
  image?: string;
  stats?: Stat[];
};

export function NoiseGuaranteeSection({
  overline,
  heading,
  headingAccent,
  body,
  image,
  stats = DEFAULT_STATS,
}: NoiseGuaranteeSectionProps) {
  return (
    <section
      className="border-foreground/15 border-b px-7 py-24"
      style={{ background: "var(--vn-bone)" }}
    >
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

          {/* Stats */}
          {/* <div
            className="mt-10 grid border-t pt-8"
            style={{
              gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
              borderColor: "var(--vn-rule)",
              gap: "0",
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 pr-6"
                style={{
                  borderRight:
                    i < stats.length - 1 ? "1px solid var(--vn-rule)" : "none",
                }}
              >
                <span
                  className="font-serif italic leading-none"
                  style={{
                    fontSize: "clamp(2rem, 3vw, 2.8rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  className="font-mono text-[9px] tracking-[.18em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div> */}
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

          {/* Corner stamp */}
          <div
            className="absolute top-4 left-4 px-2 py-1 font-mono text-[9.5px] tracking-[.2em] uppercase"
            style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
          >
            Detroit Studio
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
