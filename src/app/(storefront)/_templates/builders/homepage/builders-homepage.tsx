import type { DefaultHomepageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { parseTemplateListRows } from "~/lib/template-fields";
import { isSectionVisible } from "~/lib/sp-meta";
import { HydrateClient } from "~/trpc/server";

import { resolveFields } from "..";
import { BuildersCtaSection } from "./builders-cta-section";
import { BuildersHeroSection } from "./builders-hero-section";
import { BuildersProjectsSection } from "./builders-projects-section";
import { BuildersStorySection } from "./builders-story-section";

export async function BuildersHomepage({
  business,
}: DefaultHomepageTemplateProps) {
  const customFields = business?.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;

  const f = resolveFields(customFields, [
    "builders.homepage.hero-title",
    "builders.homepage.hero-subtitle",
    "builders.homepage.hero-bg-image",
    "builders.homepage.hero-cta1-label",
    "builders.homepage.hero-cta1-href",
    "builders.homepage.hero-cta2-label",
    "builders.homepage.hero-cta2-href",
    "builders.homepage.story-heading",
    "builders.homepage.story-body-1",
    "builders.homepage.story-body-2",
    "builders.homepage.story-image",
    "builders.homepage.projects-heading",
    "builders.homepage.projects-view-all-href",
    "builders.homepage.cta-heading",
    "builders.homepage.cta-body",
    "builders.homepage.cta-button-label",
    "builders.homepage.cta-button-href",
  ]);

  // Parse the projects list field from raw customFields (it's an array, not a string)
  const rawProjects =
    customFields && Array.isArray(customFields["builders.homepage.projects"])
      ? customFields["builders.homepage.projects"]
      : [];
  const projects = parseTemplateListRows(rawProjects);

  return (
    <HydrateClient>
      {/* 1. Hero */}
      <BuildersHeroSection
        title={f["builders.homepage.hero-title"] ?? ""}
        subtitle={f["builders.homepage.hero-subtitle"] ?? ""}
        bgImage={f["builders.homepage.hero-bg-image"] ?? ""}
        cta1Label={f["builders.homepage.hero-cta1-label"] ?? ""}
        cta1Href={f["builders.homepage.hero-cta1-href"] ?? "/contact"}
        cta2Label={f["builders.homepage.hero-cta2-label"] ?? ""}
        cta2Href={f["builders.homepage.hero-cta2-href"] ?? "/about"}
        sectionAttrs={sectionGroupAttr("homepage", "hero")}
      />

      {/* 2. Story / Ownership */}
      <BuildersStorySection
        heading={f["builders.homepage.story-heading"] ?? ""}
        body1={f["builders.homepage.story-body-1"] ?? ""}
        body2={f["builders.homepage.story-body-2"] ?? ""}
        image={f["builders.homepage.story-image"] ?? ""}
        sectionAttrs={sectionGroupAttr("homepage", "story")}
      />

      {/* 3. Recent Projects bento grid */}
      <BuildersProjectsSection
        heading={f["builders.homepage.projects-heading"] ?? ""}
        viewAllHref={
          f["builders.homepage.projects-view-all-href"] ?? "/contact"
        }
        projects={projects}
        sectionAttrs={sectionGroupAttr("homepage", "projects")}
      />

      {/* 4. CTA */}
      {isSectionVisible(customFields, "builders", "homepage.cta") && (
        <BuildersCtaSection
          heading={f["builders.homepage.cta-heading"] ?? ""}
          body={f["builders.homepage.cta-body"] ?? ""}
          buttonLabel={f["builders.homepage.cta-button-label"] ?? ""}
          buttonHref={f["builders.homepage.cta-button-href"] ?? "/contact"}
          sectionAttrs={sectionGroupAttr("homepage", "cta")}
          headingFieldKey="builders.homepage.cta-heading"
          bodyFieldKey="builders.homepage.cta-body"
          buttonLabelFieldKey="builders.homepage.cta-button-label"
        />
      )}
    </HydrateClient>
  );
}
