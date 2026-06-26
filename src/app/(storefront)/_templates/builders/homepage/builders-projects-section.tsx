"use client";

import Link from "next/link";

import type { TemplateListRow } from "~/lib/template-fields";

type BuildersProjectsSectionProps = {
  heading: string;
  viewAllHref: string;
  projects: TemplateListRow[];
  sectionAttrs?: Record<string, string>;
};

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
    <section
      {...sectionAttrs}
      className="px-4 py-24 md:px-12"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Section header */}
        <div className="mb-12 flex items-end justify-between border-b border-gray-200 pb-4">
          <h2
            className="text-3xl font-semibold uppercase text-gray-900 md:text-[40px] md:leading-tight"
            style={{
              fontFamily: "var(--font-builders-display, 'Jost', sans-serif)",
              letterSpacing: "-0.01em",
            }}
          >
            {heading}
          </h2>
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest transition-colors hover:opacity-70"
              style={{
                fontFamily: "var(--font-builders-body, 'Agdasima', sans-serif)",
                color: "var(--builders-accent, #FFC5B6)",
              }}
              aria-label="View all projects"
            >
              View All Projects
              <svg
                className="h-3 w-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
        </div>

        {/* Bento grid — only shown when there are projects */}
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:h-[800px] md:grid-cols-4 md:grid-rows-2">
            {/* ── Large feature card (col-span-2 row-span-2) ── */}
            {featured && (
              <div className="group relative cursor-pointer overflow-hidden border border-gray-200 bg-gray-50 grayscale transition-all duration-700 hover:grayscale-0 md:col-span-2 md:row-span-2">
                {getStr(featured, "image") ? (
                  <img
                    src={getStr(featured, "image")}
                    alt={getStr(featured, "title")}
                    className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity transition-all duration-700 group-hover:mix-blend-normal"
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
                      className="mb-4 inline-block border bg-black/50 px-2 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-sm"
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
                    className="mb-2 text-2xl font-medium uppercase text-white"
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
              </div>
            )}

            {/* ── Secondary cards ── */}
            {rest.slice(0, 2).map((project, i) => (
              <div
                key={project._id ?? i}
                className="group relative cursor-pointer overflow-hidden border border-gray-200 bg-gray-50 grayscale transition-all duration-700 hover:grayscale-0 md:col-span-1 md:row-span-1"
              >
                {getStr(project, "image") ? (
                  <img
                    src={getStr(project, "image")}
                    alt={getStr(project, "title")}
                    className="absolute inset-0 h-full w-full object-cover mix-blend-luminosity transition-all duration-700 group-hover:mix-blend-normal"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-200" />
                )}
                <div
                  className="absolute inset-0 bg-black/40 transition-all duration-700 group-hover:bg-black/10"
                  aria-hidden="true"
                />
                <div className="absolute bottom-0 left-0 p-6">
                  <h3
                    className="text-xl font-semibold uppercase text-white drop-shadow-md"
                    style={{
                      fontFamily:
                        "var(--font-builders-display, 'Jost', sans-serif)",
                    }}
                  >
                    {getStr(project, "title") || `Project ${i + 2}`}
                  </h3>
                </div>
              </div>
            ))}

            {/* ── Wide text card (last slot, col-span-2) ── */}
            {rest.length >= 3 ? (
              <div className="group relative cursor-pointer overflow-hidden border border-gray-200 bg-white p-8 grayscale transition-all duration-700 hover:grayscale-0 md:col-span-2 md:row-span-1 flex flex-col justify-center items-start">
                {/* Subtle texture bg */}
                {getStr(rest[2]!, "image") && (
                  <div
                    className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-10"
                    style={{
                      backgroundImage: `url(${getStr(rest[2]!, "image")})`,
                      backgroundSize: "cover",
                    }}
                    aria-hidden="true"
                  />
                )}
                {getStr(rest[2]!, "category") && (
                  <span
                    className="relative z-10 mb-4 inline-block border border-gray-300 px-2 py-1 text-[11px] font-bold uppercase tracking-widest text-gray-500"
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
              </div>
            ) : (
              /* Fill the fourth grid cell when fewer than 4 projects */
              featured && (
                <div
                  className="hidden border border-gray-200 bg-gray-50 md:col-span-2 md:row-span-1 md:flex md:items-center md:justify-center"
                  aria-hidden="true"
                >
                  <span
                    className="text-xs uppercase tracking-widest text-gray-300"
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
              className="text-xs uppercase tracking-widest text-gray-400"
              style={{
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
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
