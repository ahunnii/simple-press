import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field / group / section module for the `relocation` template's Contact page
 * (design.md → "Per-page section concepts → Contact").
 *
 * Two sections only:
 *   1. `contact.hero`  — the wave hero (no photo on this page, per screenshot).
 *   2. `contact.visit` — the "Visit Us" block: address / hours / phone / email
 *                        beside a real interactive MapLibre map.
 *
 * There is deliberately NO contact form here (design.md deviation #5, approved
 * 2026-08-10): the reference screenshot shows none, and the homepage quote form
 * is the lead channel. The clone's three extra code-only sections ("MELVYN"
 * reasons, testimonials, gallery) are dropped for the same reason.
 *
 * Copy defaults follow the SCREENSHOT, not the clone code, wherever they
 * disagree (docs/relocation/"Contact Us _ Handy Relocations.jpeg"): the clone
 * still carried the old 9336 Jameson St address, a stale (734) phone number and
 * no email row.
 */

// ─── contact.hero ────────────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "relocation.contact.hero-heading",
    label: "Hero Heading",
    description:
      "The big white headline on the terracotta wave at the top of the Contact page.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "CONTACT US",
  },
  {
    key: "relocation.contact.hero-subheading",
    label: "Hero Paragraph",
    description:
      "Short welcome line under the hero headline. Leave blank to hide it.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue: "Please feel free to contact us we'd love to hear from you!",
  },
  {
    key: "relocation.contact.hero-cta-label",
    label: "Hero Button Label",
    description:
      "Outlined button on the hero. It dials the header call button's phone link. Leave blank to hide the button.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "CALL US TODAY",
  },
];

// ─── contact.visit ───────────────────────────────────────────────────────────

const contactVisitData: TemplateField[] = [
  {
    key: "relocation.contact.visit-heading",
    label: "Section Heading",
    description:
      "Large dark heading above the address block (e.g. 'Visit Us'). Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Visit Us",
  },
  {
    key: "relocation.contact.address-line-1",
    label: "Address Line 1",
    description: "Street address, first line of the address block.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "440 BURROUGHS ST SUITE 131",
  },
  {
    key: "relocation.contact.address-line-2",
    label: "Address Line 2",
    description:
      "City, state and ZIP, second line of the address block. Leave blank to hide it.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "DETROIT, MI 48202",
  },
  {
    key: "relocation.contact.hours-label",
    label: "Hours Label",
    description:
      "Bold label above the opening hours. Leave blank to show the hours with no label.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Hours",
  },
  {
    key: "relocation.contact.hours-value",
    label: "Hours",
    description:
      "When you're reachable, shown under the Hours label. Leave blank to hide the whole hours row.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Open 24/7",
  },
  {
    key: "relocation.contact.phone-label",
    label: "Phone Label",
    description:
      "Bold label above the phone number. Leave blank to show the number with no label.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Phone",
  },
  {
    key: "relocation.contact.phone-value",
    label: "Phone Number",
    description:
      "Phone number as customers should read it. Shown under the Phone label as a tap-to-call link. Leave blank to hide the whole phone row.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "(313)-241-0291",
  },
  {
    key: "relocation.contact.phone-href",
    label: "Phone Link",
    description:
      "What the phone number dials. Keep the `tel:` prefix. Separate from the header call button so you can publish a different line here.",
    type: "url",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "tel:+13132410291",
  },
  {
    key: "relocation.contact.email-label",
    label: "Email Label",
    description:
      "Bold label above the email address. Leave blank to show the address with no label.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Email:",
  },
  {
    key: "relocation.contact.email-value",
    label: "Email Address",
    description:
      "Shown under the Email label as a mailto link, using this exact address as both the link and the visible text. Leave blank to hide the whole email row.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Handyrelocations@gmail.com",
  },
  {
    key: "relocation.contact.map-latitude",
    label: "Map Latitude",
    description:
      "Latitude of the pin on the map beside the address, e.g. 42.3693. Clear this (or the longitude) to hide the map entirely.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "42.3693",
    placeholder: "42.3693",
  },
  {
    key: "relocation.contact.map-longitude",
    label: "Map Longitude",
    description:
      "Longitude of the pin on the map beside the address, e.g. -83.0703. Clear this (or the latitude) to hide the map entirely.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "-83.0703",
    placeholder: "-83.0703",
  },
  {
    key: "relocation.contact.map-zoom",
    label: "Map Zoom",
    description:
      "How close the map starts. 12 shows the metro area; 15 shows the block. Visitors can still zoom in and out.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "12",
    placeholder: "12",
  },
];

// ─── Aggregated exports ──────────────────────────────────────────────────────

export const relocationContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactVisitData,
];

export const relocationContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Hero",
    description:
      "Terracotta wave hero at the top of the Contact page: headline, welcome line and call button",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "contact.visit",
    title: "Visit Us",
    description:
      "Address, hours, phone and email beside an interactive map of your location",
    icon: "📍",
    columns: 2,
  },
];

export const relocationContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Hero",
    description:
      "Wave hero with the page headline, welcome line and 'Call us today' button",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.visit",
    page: "contact",
    title: "Visit Us",
    description:
      "Address / hours / phone / email column beside an interactive map",
    groupIds: ["contact.visit"],
    order: 1,
    hideable: true,
  },
];
