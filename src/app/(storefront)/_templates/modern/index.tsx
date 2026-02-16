import type { TemplateField } from "~/lib/template-fields";

export const globalData: TemplateField[] = [
  {
    key: "global.logo",
    label: "Logo",
    description: "Logo for the global header",
    type: "url",
    page: "global",
  },
  {
    key: "homepage.portfolio.gallery",
    label: "Portfolio Gallery",
    description: "Gallery to display on homepage",
    type: "gallery",
    page: "homepage",
  },
];
