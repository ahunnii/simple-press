import Image from "next/image";
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
      className="relative flex min-h-[90vh] w-full items-center px-4 py-24 md:px-12"
      style={{ background: "var(--builders-ink, #131313)" }}
    >
      {/* LCP background image */}
      {hasBg && (
        <Image
          src={bgImage}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 z-10 bg-black/50" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-20 mx-auto w-full max-w-[1280px] pt-20">
        <div className="builders-on-dark flex w-full max-w-2xl flex-col gap-6 bg-black/20 p-8 backdrop-blur-sm">
          <h1
            className="text-4xl leading-none font-light tracking-tighter [overflow-wrap:anywhere] break-words text-white uppercase md:text-6xl lg:text-7xl"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
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
                className="inline-block border border-[var(--builders-accent)] bg-[var(--builders-accent)] px-8 py-4 text-xs font-bold tracking-[0.1em] text-[var(--builders-accent-ink)] uppercase transition-colors hover:border-[var(--builders-accent-hover)] hover:bg-[var(--builders-accent-hover)]"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                }}
              >
                {cta1Label}
              </Link>
            )}

            {cta2Label && (
              <Link
                href={cta2Href || "/about"}
                className="inline-block border border-white/50 bg-transparent px-8 py-4 text-xs font-bold tracking-[0.1em] text-white uppercase transition-colors hover:bg-white/10"
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
