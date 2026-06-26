"use client";

type BuildersStorySectionProps = {
  heading: string;
  body1: string;
  body2: string;
  image: string;
  sectionAttrs?: Record<string, string>;
};

export function BuildersStorySection({
  heading,
  body1,
  body2,
  image,
  sectionAttrs,
}: BuildersStorySectionProps) {
  return (
    <section
      {...sectionAttrs}
      className="border-y border-gray-200 bg-white px-4 py-24 md:px-12"
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-12 md:grid-cols-12">
        {/* Image column */}
        <div className="group md:col-span-5">
          <div
            className="relative h-[420px] overflow-hidden border border-gray-200 bg-gray-50 grayscale transition-all duration-700 hover:grayscale-0 md:h-[500px]"
            aria-hidden={!image ? "true" : undefined}
          >
            {image ? (
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover mix-blend-luminosity transition-all duration-700 group-hover:mix-blend-normal"
              />
            ) : (
              /* Placeholder when no image is set */
              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                <span className="text-xs uppercase tracking-widest text-gray-400">
                  Story Image
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="hidden md:col-span-1 md:block" />

        {/* Text column */}
        <div className="flex flex-col gap-6 md:col-span-6">
          <h2
            className="text-3xl font-semibold uppercase text-gray-900 md:text-[40px] md:leading-tight"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              letterSpacing: "-0.01em",
            }}
          >
            {heading}
          </h2>

          {/* Accent rule */}
          <div
            className="h-1 w-12"
            style={{ background: "var(--builders-accent, #FFC5B6)" }}
            aria-hidden="true"
          />

          {body1 && (
            <p className="text-base leading-relaxed text-gray-700 text-justify">
              {body1}
            </p>
          )}

          {body2 && (
            <p className="text-base leading-relaxed text-gray-700 text-justify">
              {body2}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
