import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const aboutPageData: TemplateField[] = [
  {
    key: "pollen.about.title",
    label: "About Heading",
    description: "Heading for your top about section",
    type: "text",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue: "Heya!",
    placeholder: "Heya!",
  },
  {
    key: "pollen.about.text",
    label: "About Text",
    description: "Text for the about page",
    type: "textarea",
    page: "about",
    group: "about.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    placeholder: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
  },
  {
    key: "pollen.about.image",
    label: "About Image",
    description: "Image for the about page",
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
    label: "Owner Section Subheader",
    description:
      "Small label above the owner section (e.g. The Face Behind [Business])",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "The Face Behind the Business",
    placeholder: "The Face Behind [Business]",
  },
  {
    key: "pollen.about.owner-heading",
    label: "Owner Section Heading",
    description: "Heading for the owner section (e.g. Meet [Name])",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "Meet the Owner",
    placeholder: "Meet the Owner",
  },
  {
    key: "pollen.about.owner-name",
    label: "Owner Name",
    description: "Name of the featured owner",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Jane Smith",
    placeholder: "Jane Smith",
  },
  {
    key: "pollen.about.owner-role",
    label: "Owner Role",
    description: "Title or role (e.g. Owner, Founder)",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Owner",
    placeholder: "Owner",
  },
  {
    key: "pollen.about.owner-image",
    label: "Owner Image",
    description: "Photo of the owner",
    type: "image",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "pollen.about.owner-blurb",
    label: "Owner Bio",
    description: "Short bio or blurb about who they are",
    type: "textarea",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue: "A few sentences about the owner and their story.",
    placeholder: "A few sentences about the owner and their story.",
  },
];

export const pollenAboutData = [...aboutPageData, ...aboutOwnerData];

export const pollenAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.main",
    title: "About Us",
    description: "Flush out your about page",
    icon: "📖",
    columns: 2,
  },
  {
    id: "about.owner",
    title: "Owner",
    description: "Featured owner section on the about page (image and bio)",
    icon: "👤",
    columns: 2,
  },
];
