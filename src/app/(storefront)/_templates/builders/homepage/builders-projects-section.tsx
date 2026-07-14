import Link from "next/link";

import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr } from "~/lib/preview/section-attrs";

type BuildersProjectsSectionProps = {
  heading: string;
  viewAllHref: string;
  projects: TemplateListRow[];
  sectionAttrs?: Record<string, string>;
};

/** Wordless accent-circle arrow button — hidden by default, revealed on group hover */
function ArrowButton({ position }: { position: "bottom-right" | "top-right" }) {
  const posClass =
    position === "bottom-right" ? "bottom-6 right-6" : "top-4 right-4";
  return (
    <div
      className={`absolute ${posClass} z-10 flex h-12 w-12 translate-y-2 items-center justify-center rounded-full opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100`}
      style={{ background: "var(--builders-accent, #FFC5B6)" }}
      aria-hidden="true"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="var(--builders-ink, #131313)"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          d="M3 8h10M9 4l4 4-4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function BuildersProjectsSection({
  heading,
  viewAllHref,
  projects,
  sectionAttrs,
}: BuildersProjectsSectionProps) {
  // First item is the feature card; remaining items fill the right column
  const [featured, ...rest] = projects;

  const getStr = (row: TemplateListRow, key: string): string => {
    const val = row[key];
    return typeof val === "string" ? val : "";
  };

  return (
    <section {...sectionAttrs} className="px-4 py-24 md:px-12">
      <div className="mx-auto max-w-[1280px]">
        {/* Section header */}
        <div className="mb-12 flex items-end justify-between border-b border-gray-200 pb-4">
          <h2
            {...fieldAttr("builders.homepage.projects-heading")}
            className="text-3xl font-semibold uppercase md:text-[40px] md:leading-tight"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              letterSpacing: "-0.01em",
              color: "var(--builders-ink, #131313)",
            }}
          >
            {heading}
          </h2>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="flex items-center gap-1 text-xs font-bold tracking-widest uppercase transition-colors hover:opacity-70"
              style={{
                fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-ink, #131313)",
              }}
              aria-label="View all projects"
            >
              View All Projects
              <svg
                className="h-3 w-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--builders-accent, #FFC5B6)"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Bento grid — only shown when there are projects */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:h-[800px] md:grid-cols-4 md:grid-rows-2">
            {/* ── Large feature card (col-span-2 row-span-2) ── */}
            {featured &&
              (() => {
                const featuredHref = getStr(featured, "href");
                const cardClasses = [
                  "group relative aspect-[4/3] overflow-hidden border border-gray-200 bg-gray-50 md:aspect-auto md:col-span-2 md:row-span-2",
                  featuredHref ? "cursor-pointer" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const inner = (
                  <>
                    {getStr(featured, "image") ? (
                      <img
                        src={getStr(featured, "image")}
                        alt={getStr(featured, "title")}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gray-200" />
                    )}
                    {/* Gradient overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"
                      aria-hidden="true"
                    />
                    {/* Card content */}
                    <div className="absolute bottom-0 left-0 w-full p-8">
                      {getStr(featured, "category") && (
                        <span
                          className="mb-4 inline-block border bg-black/50 px-2 py-1 text-[11px] font-bold tracking-widest uppercase backdrop-blur-sm"
                          style={{
                            fontFamily:
                              "var(--font-builders-body, 'Agdasima', sans-serif)",
                            borderColor: "var(--builders-accent, #FFC5B6)",
                            color: "var(--builders-accent, #FFC5B6)",
                          }}
                        >
                          {getStr(featured, "category")}
                        </span>
                      )}
                      <h3
                        className="mb-2 text-2xl font-medium text-white uppercase"
                        style={{
                          fontFamily:
                            "var(--font-builders-display, 'Jost', sans-serif)",
                        }}
                      >
                        {getStr(featured, "title") || "Featured Project"}
                      </h3>
                      {getStr(featured, "description") && (
                        <p className="line-clamp-2 max-w-md text-sm leading-relaxed text-gray-300">
                          {getStr(featured, "description")}
                        </p>
                      )}
                    </div>
                    {/* Wordless hover button — bottom-right, above text content */}
                    {featuredHref && <ArrowButton position="bottom-right" />}
                  </>
                );
                return featuredHref ? (
                  <Link href={featuredHref} className={cardClasses}>
                    {inner}
                  </Link>
                ) : (
                  <div className={cardClasses}>{inner}</div>
                );
              })()}

            {/* ── Secondary cards ── */}
            {rest.slice(0, 2).map((project, i) => {
              const projectHref = getStr(project, "href");
              const cardClasses = [
                "group relative aspect-[4/3] overflow-hidden border border-gray-200 bg-gray-50 md:aspect-auto md:col-span-1 md:row-span-1",
                projectHref ? "cursor-pointer" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const inner = (
                <>
                  {getStr(project, "image") ? (
                    <img
                      src={getStr(project, "image")}
                      alt={getStr(project, "title")}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-200" />
                  )}
                  <div
                    className="absolute inset-0 bg-black/40 transition-colors duration-700 group-hover:bg-black/10"
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-0 left-0 p-6">
                    <h3
                      className="text-xl font-semibold text-white uppercase drop-shadow-md"
                      style={{
                        fontFamily:
                          "var(--font-builders-display, 'Jost', sans-serif)",
                      }}
                    >
                      {getStr(project, "title") || `Project ${i + 2}`}
                    </h3>
                  </div>
                  {/* Wordless hover button — top-right */}
                  {projectHref && <ArrowButton position="top-right" />}
                </>
              );
              return projectHref ? (
                <Link
                  key={project._id ?? i}
                  href={projectHref}
                  className={cardClasses}
                >
                  {inner}
                </Link>
              ) : (
                <div key={project._id ?? i} className={cardClasses}>
                  {inner}
                </div>
              );
            })}

            {/* ── Wide text card (last slot, col-span-2) — always a link ── */}
            {rest.length >= 3 ? (
              <Link
                href={getStr(rest[2]!, "href") || viewAllHref}
                className="group relative flex cursor-pointer flex-col items-start justify-center overflow-hidden border border-gray-200 bg-white p-8 md:col-span-2 md:row-span-1"
              >
                {/* Subtle texture bg */}
                {getStr(rest[2]!, "image") && (
                  <div
                    className="pointer-events-none absolute top-0 right-0 h-full w-1/2 opacity-10"
                    style={{
                      backgroundImage: `url(${getStr(rest[2]!, "image")})`,
                      backgroundSize: "cover",
                    }}
                    aria-hidden="true"
                  />
                )}
                {getStr(rest[2]!, "category") && (
                  <span
                    className="relative z-10 mb-4 inline-block border border-gray-300 px-2 py-1 text-[11px] font-bold tracking-widest text-gray-500 uppercase"
                    style={{
                      fontFamily:
                        "var(--font-builders-body, 'Agdasima', sans-serif)",
                    }}
                  >
                    {getStr(rest[2]!, "category")}
                  </span>
                )}
                <h3
                  className="relative z-10 mb-2 text-2xl font-medium uppercase"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  {getStr(rest[2]!, "title") || "More Work"}
                </h3>
                {getStr(rest[2]!, "description") && (
                  <p className="relative z-10 max-w-sm text-sm leading-relaxed text-gray-600">
                    {getStr(rest[2]!, "description")}
                  </p>
                )}
                {/* Wordless hover button — always shown since this card always links */}
                <ArrowButton position="bottom-right" />
              </Link>
            ) : (
              /* Fill the fourth grid cell when fewer than 4 projects */
              featured && (
                <div
                  className="hidden border border-gray-200 bg-gray-50 md:col-span-2 md:row-span-1 md:flex md:items-center md:justify-center"
                  aria-hidden="true"
                >
                  <span
                    className="text-xs tracking-widest text-gray-300 uppercase"
                    style={{
                      fontFamily:
                        "var(--font-builders-body, 'Agdasima', sans-serif)",
                    }}
                  >
                    More projects coming soon
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex h-64 items-center justify-center border border-dashed border-gray-200">
            <p
              className="text-xs tracking-widest text-gray-600 uppercase"
              style={{
                fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
              }}
            >
              Add projects in your admin dashboard
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
