import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field/group/section module for the relocation `ServicesPage` slot — the
 * LEGACY services slot (design.md → Rejected alternatives: the `services`
 * feature flag stays OFF for this template, so `ServicesIndexPage` and the
 * injected DB services are never used; this file's page renders unconditionally
 * whenever `/services` is requested).
 *
 * SHARED LIST FIELD: the 2-column icon-ring service cards
 * (design.md → "Services (`/services`)" §2) read the SAME list field the
 * homepage's "Services" section defines — `relocation.homepage.services-list`
 * (owned by the homepage module, `homepage/index.ts`, group `homepage.services`)
 * — so a single edit keeps both pages in sync, exactly like vii's shop page
 * reusing the homepage's `brands-*` fields (see
 * `vii/shop/vii-shop-client.tsx` → `ViiBrandsSection`, which renders the
 * homepage's brand marquee with NO `data-sp-group` of its own). Per that same
 * precedent, this page does NOT declare a field group for the cards and does
 * NOT put a `sectionGroupAttr` on the cards section root — the only hotspot
 * for that content lives on the Homepage tab, where the group is actually
 * owned. Only the hero (page-local content) gets a group/section/hotspot here.
 *
 * The row shape (`RelocationIconRow`), the parser (`toRelocationIconRows`) and
 * the 5-row verbatim fallback (`DEFAULT_RELOCATION_SERVICES`) all live in the
 * homepage module and are imported by `relocation-services-page.tsx` — this
 * module deliberately keeps NO second copy. Phase 3 shipped a duplicate set
 * here (different row order, different alt text, straight instead of curly
 * apostrophes); it was removed in the Phase 3.5 review because the two copies
 * made the "one edit keeps both pages in sync" contract false and re-exported
 * the same symbol name from two modules.
 */

// ─── Services — Hero (page-local) ──────────────────────────────────────────

const servicesHeroData: TemplateField[] = [
  {
    key: "relocation.services.hero-heading",
    label: "Hero Heading",
    description: "The big white headline on the terracotta wave hero.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "Services",
  },
  {
    key: "relocation.services.hero-subheading",
    label: "Hero Paragraph",
    description:
      "Short reassurance paragraph under the hero headline. Leave blank to hide it.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Here at Handy Relocations, We provide easy, clear pricing and kind, friendly movers for all of your moving needs. We want you to be stress-free during your move with us",
  },
  {
    key: "relocation.services.hero-cta-label",
    label: "Hero Button Label",
    description:
      "Outlined button on the hero. It dials the header call button's phone link. Leave blank to hide the button.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "CALL US TODAY",
  },
  {
    key: "relocation.services.hero-image",
    label: "Hero Photo",
    description:
      "Circular van photo beside the hero headline. Leave blank to run the headline full width.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/services-hero-van.webp",
  },
  {
    key: "relocation.services.hero-image-alt",
    label: "Hero Photo Alt Text",
    description: "Accessible description of the hero photo.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "The Handy Relocations moving van",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const relocationServicesData: TemplateField[] = [...servicesHeroData];

export const relocationServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Hero",
    description:
      "Terracotta wave hero: headline, paragraph, call button and circular van photo",
    icon: "🚚",
    columns: 2,
  },
];

export const relocationServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Hero",
    description: "Wave hero with headline, paragraph and call button.",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
];
