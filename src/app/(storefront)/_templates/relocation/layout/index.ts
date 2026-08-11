import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Global (chrome) field module for `relocation` — everything the header,
 * footer and the shared credentials band render on every page.
 *
 * All defaults are transcribed 1:1 from the cloned source (header nav +
 * `page.tsx` footer n563–n649) and the reference screenshots, per brief.md
 * ("all 1:1 copy ships as field `defaultValue`s"), including source quirks:
 *  - "Rights &  Responsibilities" keeps its double space.
 *  - "Furniture & Delivery Pick Up" keeps the source's word order (the
 *    services SECTION calls the same service "Furniture Pick Up & Delivery" —
 *    both spellings are in the source and both are preserved).
 * The two user-approved fixes are applied: the header pill targets
 * `tel:+13132410291` (source had the `tel:++` typo) and the footer phone link
 * targets the number it displays (source linked `tel:+17373674294`). The city
 * line follows design.md's "Detroit, MI" rather than the source's "Detroit,MI".
 *
 * The five footer service labels and the four credential logos are SCALAR
 * fields rather than one `list` field on purpose: list fields cannot carry a
 * meaningful `defaultValue` (every list in the repo ships `defaultValue: ""`),
 * and a fresh store must render the real 1:1 footer on day one.
 *
 * Aggregated into `relocationData` / `relocationFieldGroups` by
 * `_templates/relocation/index.ts`.
 */

// ─── Global: Branding (header) ───────────────────────────────────────────────

const globalBrandingData: TemplateField[] = [
  {
    key: "relocation.global.branding.logo",
    label: "Header Logo",
    description:
      "Circular badge in the header, linking home. An owner logo uploaded in Settings overrides this.",
    type: "image",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue: "/templates/relocation/images/logo.webp",
  },
  {
    key: "relocation.global.branding.logo-alt",
    label: "Header Logo Alt Text",
    description: "Accessible description of the header logo.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Handy Relocations",
  },
  {
    key: "relocation.global.branding.about-label",
    label: "Nav — About Menu Label",
    description:
      "Label on the header's dropdown trigger, which opens the Backstory / Reviews / FAQ menu.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
  },
  {
    key: "relocation.global.branding.backstory-label",
    label: "Nav — Backstory Link Label",
    description: "First item in the About menu; links to the About page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Backstory",
  },
  {
    key: "relocation.global.branding.reviews-label",
    label: "Nav — Reviews Link Label",
    description: "Second item in the About menu; links to the Reviews page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Reviews",
  },
  {
    key: "relocation.global.branding.faq-label",
    label: "Nav — FAQ Link Label",
    description: "Third item in the About menu; links to the FAQ page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "FAQ",
  },
  {
    key: "relocation.global.branding.services-label",
    label: "Nav — Services Link Label",
    description: "Second top-level header link; goes to the Services page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Services",
  },
  {
    key: "relocation.global.branding.contact-label",
    label: "Nav — Contact Link Label",
    description: "Third top-level header link; goes to the Contact page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
  },
  {
    key: "relocation.global.branding.phone-label",
    label: "Header Call Button Label",
    description:
      "Text on the terracotta pill at the end of the header nav, and on the same pill inside the mobile menu.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "CALL US AT 313-241-0291",
  },
  {
    key: "relocation.global.branding.phone-href",
    label: "Header Call Button Link",
    description:
      "Where the call pill dials. Use a `tel:` link with the full country code, e.g. tel:+13132410291.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "tel:+13132410291",
  },
];

// ─── Global: Footer ──────────────────────────────────────────────────────────

const globalFooterData: TemplateField[] = [
  {
    key: "relocation.global.footer.about-heading",
    label: "Footer — About Column Heading",
    description: "Heading above the promise blurb in the first footer column.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
  },
  {
    key: "relocation.global.footer.about-blurb",
    label: "Footer — About Blurb",
    description: "Short promise paragraph in the first footer column.",
    type: "textarea",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue:
      "We promise you skilled and experienced moving professionals that pride themselves on safety and customer service. Fast, efficient and reliable!",
  },
  {
    key: "relocation.global.footer.services-heading",
    label: "Footer — Services Column Heading",
    description: "Heading above the bulleted service list.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Our Services",
  },
  {
    key: "relocation.global.footer.service-1",
    label: "Footer — Service 1",
    description:
      "First bullet in the footer service list. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Local Moves & Long Distance",
  },
  {
    key: "relocation.global.footer.service-2",
    label: "Footer — Service 2",
    description:
      "Second bullet in the footer service list. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Full Service",
  },
  {
    key: "relocation.global.footer.service-3",
    label: "Footer — Service 3",
    description:
      "Third bullet in the footer service list. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Labor Only",
  },
  {
    key: "relocation.global.footer.service-4",
    label: "Footer — Service 4",
    description:
      "Fourth bullet in the footer service list. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Packing",
  },
  {
    key: "relocation.global.footer.service-5",
    label: "Footer — Service 5",
    description:
      "Fifth bullet in the footer service list. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Furniture & Delivery Pick Up",
  },
  {
    key: "relocation.global.footer.areas-heading",
    label: "Footer — Areas We Serve Heading",
    description: "Heading above the service-area line.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Areas We Serve",
  },
  {
    key: "relocation.global.footer.areas-served",
    label: "Footer — Areas We Serve",
    description:
      "The counties or regions you cover. Leave blank to hide the bullet.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Wayne County, MI",
  },
  {
    key: "relocation.global.footer.links-heading",
    label: "Footer — Helpful Links Heading",
    description: "Heading above the helpful-links bullets.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Helpful Links",
  },
  {
    key: "relocation.global.footer.rights-label",
    label: "Footer — Rights & Responsibilities Label",
    description:
      "Plain-text helpful-links bullet (not a link in the source). Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Rights &  Responsibilities",
  },
  {
    key: "relocation.global.footer.checklist-label",
    label: "Footer — Moving Checklist Label",
    description:
      "Text of the helpful-links bullet that opens the moving-checklist PDF in a new tab.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Moving Checklist",
  },
  {
    key: "relocation.global.footer.checklist-url",
    label: "Footer — Moving Checklist URL",
    description:
      "Where the moving-checklist bullet points. Defaults to the FMCSA 'Ready to Move' brochure.",
    type: "url",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-full",
    defaultValue:
      "https://www.fmcsa.dot.gov/sites/fmcsa.dot.gov/files/docs/Ready_To_Move_Brochure_2006.pdf",
  },
  {
    key: "relocation.global.footer.contact-heading",
    label: "Footer — Contact Column Heading",
    description: "Heading above the footer contact block.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "CONTACT US",
  },
  {
    key: "relocation.global.footer.contact-name",
    label: "Footer — Business Name",
    description: "Business name shown at the top of the footer contact block.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Handy Relocations",
  },
  {
    key: "relocation.global.footer.contact-city",
    label: "Footer — City",
    description: "City and state line in the footer contact block.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Detroit, MI",
  },
  {
    key: "relocation.global.footer.contact-phone-label",
    label: "Footer — Phone Number",
    description:
      "Phone number as displayed in the footer. Leave blank to hide the phone line.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "(313)-649-4917",
  },
  {
    key: "relocation.global.footer.contact-phone-href",
    label: "Footer — Phone Link",
    description:
      "Where the footer phone number dials. Use a `tel:` link with the full country code.",
    type: "url",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "tel:+13136494917",
  },
  {
    key: "relocation.global.footer.contact-hours",
    label: "Footer — Hours",
    description: "Opening-hours line at the bottom of the contact block.",
    type: "text",
    page: "global",
    group: "global.footer",
    gridColumn: "col-span-1",
    defaultValue: "Open 24/7",
  },
];

// ─── Global: Credentials band ────────────────────────────────────────────────

const globalCredentialsData: TemplateField[] = [
  {
    key: "relocation.global.credentials.heading",
    label: "Credentials — Heading",
    description:
      "Heading of the credentials band that closes Services, Backstory, Reviews, Contact and FAQ.",
    type: "text",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-full",
    defaultValue:
      "Our Credentials and Affiliations- Professional Moving Company",
  },
  {
    key: "relocation.global.credentials.heading-home",
    label: "Credentials — Homepage Heading",
    description:
      "Shorter heading used by the credentials band on the homepage only.",
    type: "text",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-full",
    defaultValue: "Our Credentials and Affiliations",
  },
  {
    key: "relocation.global.credentials.logo-1",
    label: "Credentials — Logo 1",
    description: "First association logo. Leave blank to hide it.",
    type: "image",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/credential-ata.webp",
  },
  {
    key: "relocation.global.credentials.logo-1-alt",
    label: "Credentials — Logo 1 Alt Text",
    description: "Accessible description of the first association logo.",
    type: "text",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "American Trucking Associations",
  },
  {
    key: "relocation.global.credentials.logo-2",
    label: "Credentials — Logo 2",
    description: "Second association logo. Leave blank to hide it.",
    type: "image",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/credential-mma.webp",
  },
  {
    key: "relocation.global.credentials.logo-2-alt",
    label: "Credentials — Logo 2 Alt Text",
    description: "Accessible description of the second association logo.",
    type: "text",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "Michigan Movers Association",
  },
  {
    key: "relocation.global.credentials.logo-3",
    label: "Credentials — Logo 3",
    description: "Third association logo. Leave blank to hide it.",
    type: "image",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/credential-samaritas.webp",
  },
  {
    key: "relocation.global.credentials.logo-3-alt",
    label: "Credentials — Logo 3 Alt Text",
    description: "Accessible description of the third association logo.",
    type: "text",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "Samaritas",
  },
  {
    key: "relocation.global.credentials.logo-4",
    label: "Credentials — Logo 4",
    description: "Fourth association logo. Leave blank to hide it.",
    type: "image",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "/templates/relocation/images/credential-hiresafe.webp",
  },
  {
    key: "relocation.global.credentials.logo-4-alt",
    label: "Credentials — Logo 4 Alt Text",
    description: "Accessible description of the fourth association logo.",
    type: "text",
    page: "global",
    group: "global.credentials",
    gridColumn: "col-span-1",
    defaultValue: "HireSafe compliant employment screening",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const relocationGlobalData: TemplateField[] = [
  ...globalBrandingData,
  ...globalFooterData,
  ...globalCredentialsData,
];

export const relocationGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Header & Navigation",
    description:
      "Logo, nav labels and the terracotta call button — shown on every page",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "global.footer",
    title: "Footer",
    description:
      "The four charcoal footer columns: about blurb, services, areas served and helpful links, contact details",
    icon: "📋",
    columns: 2,
  },
  {
    id: "global.credentials",
    title: "Credentials & Affiliations",
    description:
      "Trust band of association logos that closes every page in the site",
    icon: "🏅",
    columns: 2,
  },
];
