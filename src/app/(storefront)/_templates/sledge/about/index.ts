import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── About Page ───────────────────────────────────────────────────────────────

const aboutSledgeData: TemplateField[] = [
  {
    key: "sledge.about-hero-heading",
    label: "Heading",
    description:
      'Large heading above the three introduction rows (e.g. "About The Artist").',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "About The Artist",
  },
  {
    key: "sledge.about-hero-image",
    label: "Photo",
    description:
      "Full-width photo at the top of the about page. Shows a color panel when left blank.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "sledge.about.section-1-label",
    label: "Row 1 label",
    description: 'Short bold label for the first row (e.g. "My Story.").',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
    defaultValue: "My Story.",
  },
  {
    key: "sledge.about.section-1-body",
    label: "Row 1 text",
    description: "Paragraph text for the first row.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
  },
  {
    key: "sledge.about.section-2-label",
    label: "Row 2 label",
    description: 'Short bold label for the second row (e.g. "What I Do.").',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
    defaultValue: "What I Do.",
  },
  {
    key: "sledge.about.section-2-body",
    label: "Row 2 text",
    description: "Paragraph text for the second row.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
  },
  {
    key: "sledge.about.section-3-label",
    label: "Row 3 label",
    description: 'Short bold label for the third row (e.g. "My Services.").',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
    defaultValue: "My Services.",
  },
  {
    key: "sledge.about.section-3-body",
    label: "Row 3 text",
    description: "Paragraph text for the third row.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
  },
];

const aboutTrendingData: TemplateField[] = [
  {
    key: "sledge.about.trending-heading",
    label: "Heading",
    description:
      "Heading for the product rail at the bottom of the about page.",
    type: "text",
    page: "about",
    group: "about.trending",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
];

export const sledgeAboutData = [...aboutSledgeData, ...aboutTrendingData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Hero",
    description: "Full-width photo at the top of the about page.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "about.main",
    title: "Introduction",
    description: "Heading and three labeled rows introducing your story.",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.trending",
    title: "Trending products",
    description: "Product rail shown below the about page content.",
    icon: "🛍️",
    columns: 1,
  },
];
