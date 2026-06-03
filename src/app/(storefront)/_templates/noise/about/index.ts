import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── About Page ───────────────────────────────────────────────────────────────

const aboutNoiseData: TemplateField[] = [
  {
    key: "noise.about-hero-heading",
    label: "About Hero Heading",
    description: "Primary heading for the about page hero section",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "About Us",
  },

  {
    key: "noise.about-story-body",
    label: "Brand Story Body",
    description: "Full brand story content (richtext)",
    type: "richtext",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
  },
];

export const noiseAboutData = [...aboutNoiseData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const noiseAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.main",
    title: "About Content",
    description: "Main content section for the about page",
    icon: "�",
    columns: 2,
  },
];
