import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// Footer tagline and social links come from Content → Branding; email and
// phone from Settings. Only the merchant-facing footer copy lives here.

export const elegantLayoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.footer",
    title: "Footer",
    description:
      "Column headings and closing line in the footer on every page. The tagline and social links come from Content → Branding.",
    icon: "🔗",
    columns: 2,
  },
];

export const elegantLayoutData: TemplateField[] = [
  {
    key: "elegant.global.footer-shop-heading",
    label: "Shop column heading",
    description: "Heading above the shop links in the footer.",
    type: "text",
    page: "global",
    group: "global.footer",
    defaultValue: "Shop",
    placeholder: "e.g. Browse",
  },
  {
    key: "elegant.global.footer-info-heading",
    label: "Info column heading",
    description:
      "Heading above your policy pages, email, and phone in the footer.",
    type: "text",
    page: "global",
    group: "global.footer",
    defaultValue: "Info",
    placeholder: "e.g. Help",
  },
  {
    key: "elegant.global.footer-signoff",
    label: "Closing line",
    description:
      "Short line at the bottom right of the footer, beside the copyright. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue: "Made with care",
    placeholder: "e.g. Handmade in Detroit",
  },
];
