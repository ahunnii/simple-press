import { fieldAttr } from "~/lib/preview/section-attrs";

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
            className="relative h-[420px] overflow-hidden border border-gray-200 bg-gray-50 md:h-[500px]"
            aria-hidden={!image ? "true" : undefined}
          >
            {image ? (
              <img
                src={image}
                alt=""
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            ) : (
              /* Placeholder when no image is set */
              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                <span className="text-xs tracking-widest text-gray-600 uppercase">
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
            {...fieldAttr("builders.homepage.story-heading")}
            className="text-3xl font-semibold uppercase md:text-[40px] md:leading-tight"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              letterSpacing: "-0.01em",
              color: "var(--builders-ink, #131313)",
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
            <p
              {...fieldAttr("builders.homepage.story-body-1")}
              className="text-justify text-base leading-relaxed text-gray-700"
            >
              {body1}
            </p>
          )}

          {body2 && (
            <p
              {...fieldAttr("builders.homepage.story-body-2")}
              className="text-justify text-base leading-relaxed text-gray-700"
            >
              {body2}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
