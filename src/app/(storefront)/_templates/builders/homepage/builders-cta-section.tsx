"use client";

import Link from "next/link";

type BuildersCtaSectionProps = {
  heading: string;
  body: string;
  buttonLabel: string;
  buttonHref: string;
  sectionAttrs?: Record<string, string>;
};

export function BuildersCtaSection({
  heading,
  body,
  buttonLabel,
  buttonHref,
  sectionAttrs,
}: BuildersCtaSectionProps) {
  return (
    <section
      {...sectionAttrs}
      className="border-t border-gray-200 py-32"
      style={{ background: "var(--builders-alt, #F1F3F5)" }}
    >
      <div className="mx-auto flex max-w-[1280px] flex-col items-center px-4 text-center md:px-12">
        {/* Icon */}
        <div
          className="mb-6 text-6xl leading-none"
          style={{ color: "var(--builders-accent, #FFC5B6)" }}
          aria-hidden="true"
        >
          ⚙
        </div>

        <h2
          className="mb-6 text-4xl font-light uppercase leading-tight tracking-tighter md:text-6xl lg:text-7xl"
          style={{
            fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
            color: "var(--builders-ink, #131313)",
          }}
        >
          {heading}
        </h2>

        {body && (
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-gray-700">
            {body}
          </p>
        )}

        {buttonLabel && (
          <Link
            href={buttonHref || "/contact"}
            className="inline-block border px-12 py-5 text-xs font-bold uppercase tracking-[0.14em] transition-all duration-300"
            style={{
              fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
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
            {buttonLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
