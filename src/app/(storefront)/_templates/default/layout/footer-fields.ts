import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Footer column headings. The footer itself is a server component
 * (`default-footer.tsx`) and resolves these via `resolveFields` from the
 * root `T/default/index.ts` aggregator with these constants as the fallback
 * — see field-conventions.md "Consuming fields". Everything else in the
 * footer (nav link labels, social links, copyright, policy links) is either
 * structural nav or already owned by Settings/Content (see
 * `~/lib/social-links`), so it stays out of the field system.
 */
export const DEFAULT_FOOTER_SHOP_HEADING = "Shop";
export const DEFAULT_FOOTER_HELP_HEADING = "Help";
export const DEFAULT_FOOTER_QUICK_LINKS_HEADING = "Quick Links";

export const defaultFooterData: TemplateField[] = [
  {
    key: "default.global.footer-shop-heading",
    label: "Shop column heading",
    description: "Heading above the Shop links column in the footer",
    type: "text",
    page: "global",
    group: "global.footer",
    defaultValue: DEFAULT_FOOTER_SHOP_HEADING,
    placeholder: DEFAULT_FOOTER_SHOP_HEADING,
  },
  {
    key: "default.global.footer-help-heading",
    label: "Help column heading",
    description: "Heading above the Help links column in the footer",
    type: "text",
    page: "global",
    group: "global.footer",
    defaultValue: DEFAULT_FOOTER_HELP_HEADING,
    placeholder: DEFAULT_FOOTER_HELP_HEADING,
  },
  {
    key: "default.global.footer-quick-links-heading",
    label: "Quick Links column heading",
    description: "Heading above the Quick Links column in the footer",
    type: "text",
    page: "global",
    group: "global.footer",
    defaultValue: DEFAULT_FOOTER_QUICK_LINKS_HEADING,
    placeholder: DEFAULT_FOOTER_QUICK_LINKS_HEADING,
  },
];

export const defaultFooterFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.footer",
    title: "Footer",
    description: "Column headings shown in the site footer",
    icon: "🦶",
    columns: 2,
  },
];
