import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── About Page ───────────────────────────────────────────────────────────────

const aboutSledgeData: TemplateField[] = [
  {
    key: "sledge.about-hero-heading",
    label: "About Page Heading",
    description:
      'Large heading shown in the coral section (e.g. "About The Artist")',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "About The Artist",
  },
  {
    key: "sledge.about-hero-image",
    label: "About Hero Image",
    description: "Editorial image shown in the right half of the hero banner",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "sledge.about.section-1-label",
    label: "Section 1 Label",
    description:
      'Bold label on the left of the first content row (e.g. "My Story.")',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
    defaultValue: "My Story.",
  },
  {
    key: "sledge.about.section-1-body",
    label: "Section 1 Body",
    description: "Paragraph text for the first content row",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
  },
  {
    key: "sledge.about.section-2-label",
    label: "Section 2 Label",
    description:
      'Bold label on the left of the second content row (e.g. "What I Do.")',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
    defaultValue: "What I Do.",
  },
  {
    key: "sledge.about.section-2-body",
    label: "Section 2 Body",
    description: "Paragraph text for the second content row",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
  },
  {
    key: "sledge.about.section-3-label",
    label: "Section 3 Label",
    description:
      'Bold label on the left of the third content row (e.g. "My Services.")',
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
    defaultValue: "My Services.",
  },
  {
    key: "sledge.about.section-3-body",
    label: "Section 3 Body",
    description: "Paragraph text for the third content row",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-1",
  },
];

export const sledgeAboutData = [...aboutSledgeData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "About Hero",
    description: "Editorial image shown in the split hero banner",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "about.main",
    title: "About Content",
    description: "Section heading and three labeled content rows",
    icon: "📖",
    columns: 2,
  },
];
