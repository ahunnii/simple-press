import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const homepageHeroData: TemplateField[] = [
  {
    key: "bamboo.homepage.hero-image",
    label: "Homepage Hero Image",
    description: "Image for the hero section",
    type: "image",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.homepage.hero-title",
    label: "Homepage Hero Title",
    description: "Title for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.homepage.hero-subtitle",
    label: "Homepage Hero Subtitle",
    description: "Subtitle for the hero section",
    type: "text",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.homepage.hero-description",
    label: "Homepage Hero Description",
    description: "Description for the hero section",
    type: "textarea",
    page: "homepage",
    group: "homepage.hero",
    gridColumn: "col-span-full",
  },
];

const globalLocationData: TemplateField[] = [
  {
    key: "bamboo.global.location-address",
    label: "Global Location Address",
    description: "Address for the global location section",
    type: "text",
    page: "global",
    group: "global.location",
    gridColumn: "col-span-full",
  },
  {
    key: "bamboo.global.location-map",
    label: "Global Location Map",
    description: "Map for the global location section",
    type: "image",
    page: "global",
    group: "global.location",
    gridColumn: "col-span-full",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "homepage.hero",
    title: "Hero Section",
    description: "Main banner area at the top of homepage",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "global.location",
    title: "Global Location Section",
    description: "Global location section on the homepage",
    icon: "🎯",
    columns: 2,
  },
];
