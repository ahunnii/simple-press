"use client";

import Link from "next/link";

type BuildersHeroSectionProps = {
  title: string;
  subtitle: string;
  bgImage: string;
  cta1Label: string;
  cta1Href: string;
  cta2Label: string;
  cta2Href: string;
  sectionAttrs?: Record<string, string>;
};

export function BuildersHeroSection({
  title,
  subtitle,
  bgImage,
  cta1Label,
  cta1Href,
  cta2Label,
  cta2Href,
  sectionAttrs,
}: BuildersHeroSectionProps) {
  const hasBg = bgImage.length > 0;

  return (
    <section
      {...sectionAttrs}
      className="relative flex min-h-[90vh] w-full items-center bg-cover bg-center px-4 py-24 md:px-12"
      style={
        hasBg
          ? { backgroundImage: `url(${bgImage})` }
          : { background: "#1a1a1a" }
      }
    >
      {/* Overlay */}
      <div className="absolute inset-0 z-0 bg-black/50" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-[1280px] pt-20">
        <div className="w-full max-w-2xl flex flex-col gap-6 bg-black/20 p-8 backdrop-blur-sm">
          <h1
            className="text-4xl font-light uppercase leading-none tracking-tighter text-white md:text-6xl lg:text-7xl"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
            }}
          >
            {title}
          </h1>

          {subtitle && (
            <p
              className="max-w-xl border-l-2 pl-4 text-lg leading-relaxed text-white/90 md:text-xl"
              style={{
                borderColor: "var(--builders-accent, #FFC5B6)",
              }}
            >
              {subtitle}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-4">
            {cta1Label && (
              <Link
                href={cta1Href || "/contact"}
                className="inline-block border px-8 py-4 text-xs font-bold uppercase tracking-[0.14em] transition-colors"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                  background: "var(--builders-accent, #FFC5B6)",
                  borderColor: "var(--builders-accent, #FFC5B6)",
                  color: "var(--builders-accent-ink, #31130A)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "var(--builders-accent-hover, #F2B9AB)";
                  e.currentTarget.style.borderColor =
                    "var(--builders-accent-hover, #F2B9AB)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "var(--builders-accent, #FFC5B6)";
                  e.currentTarget.style.borderColor =
                    "var(--builders-accent, #FFC5B6)";
                }}
              >
                {cta1Label}
              </Link>
            )}

            {cta2Label && (
              <Link
                href={cta2Href || "/about"}
                className="inline-block border border-white/50 bg-transparent px-8 py-4 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/10"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                }}
              >
                {cta2Label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
