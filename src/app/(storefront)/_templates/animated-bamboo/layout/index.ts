import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Global (chrome) field module for bamboo's shared layout — currently just
 * the footer mission line under the wreath brand block
 * (`docs/templates/bamboo/design.md` → "Chrome" → Footer).
 *
 * Header nav, cart, account, and wishlist are NOT template fields — they read
 * live from `Business.siteContent.navigationItems` and feature flags, same as
 * every other template (see `bamboo-header.tsx`). The ≤900px burger opens the
 * full-screen roll-paper menu dialog (`bamboo-mobile-nav.tsx`), which renders
 * that same nav list plus the Settings phone/email, so there is nothing to
 * configure separately for mobile. Footer nav columns and the bottom-bar
 * address are likewise sourced from Content → Navigation and Settings, not
 * fields.
 *
 * NOT self-registering: merged into the root `animatedBambooData` /
 * `animatedBambooFieldGroups` / `animatedBambooSections` (`../index.tsx`, `../sections.ts`) by
 * the template's later orchestration wave.
 */
export const animatedBambooLayoutData: TemplateField[] = [
  {
    key: "animated-bamboo.global.footer-tagline",
    label: "Footer Mission Line",
    description:
      "One sentence under the wreath mark in the footer, shown on every page.",
    type: "textarea",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue:
      "Luxuriously soft, tree-free bamboo paper products, crafted in Detroit, Michigan.",
  },
];

export const animatedBambooLayoutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.footer",
    title: "Footer",
    description:
      "The mission line under the wreath brand mark in the footer, shown on every page. Shop/Company link columns, the address line, and policy links come from Content → Navigation and Settings.",
    icon: "🔗",
    columns: 1,
  },
];

export const bambooLayoutSections: TemplateSection[] = [
  {
    id: "global.footer",
    page: "global",
    title: "Footer",
    description:
      "The mission line under the wreath brand mark in the footer, shown on every page.",
    groupIds: ["global.footer"],
    order: 0,
    hideable: false,
    links: [
      { label: "Navigation", href: "/admin/content/navigation" },
      { label: "Business info", href: "/admin/settings/general" },
    ],
  },
];
