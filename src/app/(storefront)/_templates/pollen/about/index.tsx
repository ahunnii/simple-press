import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutHeroData: TemplateField[] = [
  {
    key: "pollen.about.page-title",
    label: "Page title",
    description: "Main heading shown at the top of the about page.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
    placeholder: "e.g. About Us",
  },
  {
    key: "pollen.about.page-subtitle",
    label: "Page subtitle",
    description: "Small label shown above the page title.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our Story",
    placeholder: "e.g. Our Story",
  },
];

const aboutTestimonialsData: TemplateField[] = [
  {
    key: "pollen.about.testimonials-label",
    label: "Small label",
    description:
      "Short line above the testimonials heading on the about page. Leave blank to hide it.",
    type: "text",
    page: "about",
    group: "about.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "Kind Words",
    placeholder: "One or two words",
  },
  {
    key: "pollen.about.testimonials-heading",
    label: "Heading",
    description:
      "Heading above the customer quotes on the about page. Quotes come from Admin → Testimonials.",
    type: "text",
    page: "about",
    group: "about.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "What Our Customers Say",
    placeholder: "A short heading",
  },
  {
    key: "pollen.about.testimonials-link-text",
    label: "Link text",
    description: "Text for the link below the testimonials.",
    type: "text",
    page: "about",
    group: "about.testimonials",
    gridColumn: "col-span-full",
    defaultValue: "View all testimonials",
    placeholder: "View all testimonials",
  },
];

const aboutPageData: TemplateField[] = [
  {
    key: "pollen.about.title",
    label: "Heading",
    description: "Heading for the main story section on the about page.",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "About us",
    placeholder: "About us",
  },
  {
    key: "pollen.about.text",
    label: "Body text",
    description: "Story text on the about page.",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue:
      "We started this business out of a love for craft and community. Every piece we make is a little different, shaped by the people and places that inspire us — and we're glad you're here to see it.",
    placeholder:
      "We started this business out of a love for craft and community...",
  },
  {
    key: "pollen.about.image",
    label: "Image",
    description: "Photo beside the story text on the about page.",
    type: "image",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
    page: "about",
  },
];

const aboutOwnerData: TemplateField[] = [
  {
    key: "pollen.about.owner-subheader",
    label: "Small label",
    description:
      "Short line above the owner heading, e.g. The Face Behind [Business]. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "The Face Behind the Business",
    placeholder: "The Face Behind [Business]",
  },
  {
    key: "pollen.about.owner-heading",
    label: "Heading",
    description: "Heading for the owner section, e.g. Meet [Name].",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "Meet the Owner",
    placeholder: "Meet the Owner",
  },
  {
    key: "pollen.about.owner-name",
    label: "Name",
    description: "Name of the featured owner. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Jane Smith",
  },
  {
    key: "pollen.about.owner-role",
    label: "Role",
    description: "Title or role, e.g. Owner or Founder. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Owner",
    placeholder: "Owner",
  },
  {
    key: "pollen.about.owner-image",
    label: "Photo",
    description: "Photo of the owner.",
    type: "image",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.about.owner-blurb",
    label: "Bio",
    description: "Short bio about the owner. Leave blank to hide.",
    type: "textarea",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "A few sentences about the owner and their story.",
    placeholder: "A couple of sentences about who they are...",
  },
];

export const pollenAboutData = [
  ...aboutHeroData,
  ...aboutPageData,
  ...aboutOwnerData,
  ...aboutTestimonialsData,
];

export const pollenAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Page heading",
    description: "Heading and small label at the top of the about page.",
    icon: "🔖",
    columns: 2,
  },
  {
    id: "about.main",
    title: "About Us",
    description: "Heading, story text, and photo for the about page.",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.owner",
    title: "Owner",
    description: "Featured owner section on the about page, with photo and bio.",
    icon: "👤",
    columns: 2,
  },
  {
    id: "about.testimonials",
    title: "Testimonials band",
    description:
      "Small label and heading above the customer quotes on the about page. The quotes themselves come from Admin → Testimonials.",
    icon: "⭐",
    columns: 1,
  },
];
