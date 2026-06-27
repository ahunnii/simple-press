import type { DefaultAboutPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { parseTemplateListRows } from "~/lib/template-fields";

import { resolveFields } from "..";
import { DEFAULT_TEAM_MEMBERS } from ".";

export function BuildersAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "builders.about.hero-title",
    "builders.about.hero-subtitle",
    "builders.about.hero-image",
    "builders.about.story-heading",
    "builders.about.story-body-1",
    "builders.about.story-body-2",
    "builders.about.team-heading",
  ]);

  // Parse the team-members list field from raw customFields (it's an array, not a string)
  const rawTeamMembers =
    customFields &&
    Array.isArray(customFields["builders.about.team-members"])
      ? customFields["builders.about.team-members"]
      : [];
  const parsedMembers = parseTemplateListRows(rawTeamMembers);
  const teamMembers =
    parsedMembers.length > 0 ? parsedMembers : DEFAULT_TEAM_MEMBERS;

  const heroImage = f["builders.about.hero-image"] ?? "";
  const heroTitle = f["builders.about.hero-title"] ?? "Building Cooperatively";
  const heroSubtitle = f["builders.about.hero-subtitle"] ?? "";
  const storyHeading = f["builders.about.story-heading"] ?? "Our Detroit Story";
  const storyBody1 = f["builders.about.story-body-1"] ?? "";
  const storyBody2 = f["builders.about.story-body-2"] ?? "";
  const teamHeading = f["builders.about.team-heading"] ?? "Meet the Cooperative";

  return (
    <main
      className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-32 md:px-12 md:pb-32 md:pt-48"
      style={{ background: "var(--builders-bg, #F8F9FA)" }}
    >
      {/* ── 1. Hero ─────────────────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("about", "hero")}
        className="mb-32 grid grid-cols-1 gap-6 md:grid-cols-12"
      >
        {/* Left: headline + subtitle */}
        <div className="flex flex-col justify-end md:col-span-8">
          <h1
            className="mb-6 text-4xl uppercase leading-none tracking-tight md:text-6xl lg:text-7xl"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 300,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {heroTitle}
          </h1>

          {heroSubtitle && (
            <p
              className="max-w-2xl border-l-2 pl-6 text-lg leading-relaxed md:text-xl"
              style={{
                fontFamily:
                  "var(--font-builders-body, 'Agdasima', sans-serif)",
                borderColor: "var(--builders-accent, #FFC5B6)",
                color: "var(--builders-ink, #131313)",
                opacity: 0.75,
              }}
            >
              {heroSubtitle}
            </p>
          )}
        </div>

        {/* Right: hero image */}
        <div className="mt-8 md:col-span-4 md:mt-0">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              className="h-64 w-full border object-cover md:h-full"
              style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
            />
          ) : (
            <div
              className="h-64 w-full border md:h-full"
              style={{
                borderColor: "var(--builders-rule, #e5e7eb)",
                background: "var(--builders-alt, #F1F3F5)",
              }}
              aria-hidden="true"
            />
          )}
        </div>
      </section>

      {/* ── 2. Our Detroit Story ─────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("about", "story")}
        className="mb-32"
      >
        <div
          className="grid grid-cols-1 gap-6 border-t pt-16 md:grid-cols-12"
          style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
        >
          {/* Left: heading + accent bar */}
          <div className="md:col-span-4">
            <h2
              className="mb-4 text-3xl uppercase leading-tight md:text-4xl"
              style={{
                fontFamily:
                  "var(--font-builders-display, 'Jost', sans-serif)",
                fontWeight: 600,
                color: "var(--builders-ink, #131313)",
              }}
            >
              {storyHeading}
            </h2>
            <span
              className="inline-block h-1 w-12 mb-8"
              style={{ background: "var(--builders-accent, #FFC5B6)" }}
              aria-hidden="true"
            />
          </div>

          {/* Right: two-column body paragraphs */}
          <div className="grid grid-cols-1 gap-6 md:col-span-8 md:grid-cols-2">
            {storyBody1 && (
              <p
                className="mb-6 text-base leading-relaxed"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                  color: "var(--builders-ink, #131313)",
                  opacity: 0.75,
                }}
              >
                {storyBody1}
              </p>
            )}
            {storyBody2 && (
              <p
                className="text-base leading-relaxed"
                style={{
                  fontFamily:
                    "var(--font-builders-body, 'Agdasima', sans-serif)",
                  color: "var(--builders-ink, #131313)",
                  opacity: 0.75,
                }}
              >
                {storyBody2}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Meet the Cooperative ──────────────────────────────────────────── */}
      <section {...sectionGroupAttr("about", "team")}>
        {/* Section header */}
        <div
          className="mb-16 border-t pt-16"
          style={{ borderColor: "var(--builders-rule, #e5e7eb)" }}
        >
          <h2
            className="mb-4 text-3xl uppercase leading-tight md:text-4xl"
            style={{
              fontFamily:
                "var(--font-builders-display, 'Jost', sans-serif)",
              fontWeight: 600,
              color: "var(--builders-ink, #131313)",
            }}
          >
            {teamHeading}
          </h2>
          <span
            className="inline-block h-1 w-12"
            style={{ background: "var(--builders-accent, #FFC5B6)" }}
            aria-hidden="true"
          />
        </div>

        {/* Card grid — render in rows of 3, middle card offset at md+ */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {teamMembers.map((member, i) => {
            const name = (member.name ?? "") as string;
            const role = (member.role ?? "") as string;
            const bio = (member.bio ?? "") as string;
            const image = (member.image ?? "") as string;
            // Apply translate-y-8 on middle card (index 1, 4, 7, …)
            const isMiddle = i % 3 === 1;

            return (
              <div
                key={`${name}-${i}`}
                className={[
                  "group border border-[#e5e7eb] p-6 transition-colors duration-300 hover:border-[#FFC5B6]",
                  isMiddle ? "md:translate-y-8" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  background: "var(--builders-surface, #ffffff)",
                }}
              >
                {/* Member photo */}
                {image ? (
                  <div className="mb-6 h-48 w-full overflow-hidden">
                    <img
                      src={image}
                      alt={name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div
                    className="mb-6 h-48 w-full"
                    style={{ background: "var(--builders-alt, #F1F3F5)" }}
                    aria-hidden="true"
                  />
                )}

                {/* Name */}
                <h3
                  className="mb-2 text-lg uppercase"
                  style={{
                    fontFamily:
                      "var(--font-builders-display, 'Jost', sans-serif)",
                    fontWeight: 600,
                    color: "var(--builders-ink, #131313)",
                  }}
                >
                  {name}
                </h3>

                {/* Role */}
                <p
                  className="mb-4 text-xs uppercase tracking-widest"
                  style={{
                    fontFamily:
                      "var(--font-builders-body, 'Agdasima', sans-serif)",
                    color: "var(--builders-accent-ink, #31130A)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {role}
                </p>

                {/* Bio */}
                {bio && (
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      fontFamily:
                        "var(--font-builders-body, 'Agdasima', sans-serif)",
                      color: "var(--builders-ink, #131313)",
                      opacity: 0.7,
                    }}
                  >
                    {bio}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
