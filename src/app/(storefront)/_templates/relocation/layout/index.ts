import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

/**
 * Global (chrome) field module for `relocation` — the header logo and call
 * button, the footer's chrome (column headings, about blurb, and
 * helpful-links labels), the sign-in / sign-up branding, and the shared
 * credentials band rendered on every page.
 *
 * Header nav labels, phone numbers, and the footer contact block are
 * deliberately NOT template fields — they read from platform sources of truth
 * instead: the header nav from Content → Navigation, the phone number from
 * Settings → General (rendered via `relocationTelHref`), and the footer
 * contact block from Settings → General/Hours. The footer about blurb is a
 * template field. See `relocation-header.tsx` / `relocation-footer.tsx` for
 * the read side. "Rights &  Responsibilities" (`rights-label`) keeps the
 * source's double space.
 *
 * The four credential logos are SCALAR fields rather than one `list` field on
 * purpose: list fields cannot carry a meaningful `defaultValue` (every list
 * in the repo ships `defaultValue: ""`), and a fresh store must render the
 * real 1:1 credentials band on day one.
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
    key: "relocation.global.branding.call-cta-prefix",
    label: "Call Button Prefix",
    description:
      "Text before your phone number on the terracotta call pill. The number itself comes from Settings → General. Leave blank to show just the number.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "CALL US AT",
  },
  {
    key: "relocation.global.branding.hero-cta-label",
    label: "Hero Call Button Label",
    description:
      "Outlined button on every page hero. It dials your business phone number (Settings → General). Leave blank to hide the button.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "CALL US TODAY",
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
    description:
      "Short promise paragraph in the first footer column. Leave blank to hide the About column entirely.",
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

// ─── Global: Authentication ───────────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "relocation.global.authentication-image",
    label: "Authentication Image",
    description: "Image on the side panel of the sign-in and sign-up pages.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "relocation.global.logo-size-width",
    label: "Logo Size Width",
    description:
      "Width (in pixels) of the logo on the sign-in and sign-up pages.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
  },
  {
    key: "relocation.global.logo-size-height",
    label: "Logo Size Height",
    description:
      "Height (in pixels) of the logo on the sign-in and sign-up pages.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

export const relocationGlobalData: TemplateField[] = [
  ...globalBrandingData,
  ...globalFooterData,
  ...globalCredentialsData,
  ...globalAuthenticationData,
];

export const relocationGlobalFieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Header & Branding",
    description:
      "Logo and the terracotta call button — shown on every page. Header navigation lives in Content → Navigation; your phone number comes from Settings → General.",
    icon: "🏷️",
    columns: 2,
  },
  {
    id: "global.footer",
    title: "Footer",
    description:
      "Footer chrome: column headings, areas served, about blurb and helpful-links labels. Business name, address, phone, hours and social links come from Settings; services mirror the homepage services list.",
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
  {
    id: "global.authentication",
    title: "Authentication",
    description: "Image and logo size shown on the sign-in and sign-up pages.",
    icon: "🔐",
    columns: 2,
  },
];
