import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── About Page ───────────────────────────────────────────────────────────────

const aboutNoiseData: TemplateField[] = [
  {
    key: "noise.about-overline",
    label: "Small label",
    description:
      "Small label above the heading at the top of the about page. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "Our Story",
  },
  {
    key: "noise.about-hero-heading",
    label: "Heading",
    description: "Main heading at the top of the about page.",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "About Us",
  },

  {
    key: "noise.about-story-body",
    label: "Brand story",
    description: "Full brand story shown on the about page.",
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
    title: "About page",
    description: "Small label, heading, and story text for the about page.",
    icon: "📖",
    columns: 2,
  },
];
