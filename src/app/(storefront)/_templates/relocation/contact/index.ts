import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Field / group / section module for the `relocation` template's Contact page
 * (design.md → "Per-page section concepts → Contact").
 *
 * Three sections:
 *   1. `contact.hero`  — the wave hero, with an optional round photo beside
 *                        the headline (owner can add or omit one, same as
 *                        Homepage/Services).
 *   2. `contact.visit` — the "Visit Us" block: address / hours / phone / email
 *                        beside a real interactive MapLibre map. The address,
 *                        hours, phone and email VALUES are no longer template
 *                        fields — they render straight from
 *                        `Business.businessAddress` / `phoneNumber` /
 *                        `supportEmail` / `businessHours` (Settings → General
 *                        and Settings → Hours), so there is one source of
 *                        truth instead of a second copy that can drift. Only
 *                        the bold LABEL above each value stays owner-editable
 *                        here.
 *   3. `contact.form`  — "SEND US A MESSAGE": a plain name/email/phone/message
 *                        form posting through the shared `contact.send` tRPC
 *                        pipeline via `useContactForm`, the same pipeline
 *                        every other template's contact form uses.
 *
 * design.md deviation #5 ("no contact form here — the reference screenshot
 * shows none, and the homepage quote form is the lead channel") was
 * user-approved on 2026-08-10 but REVERSED on 2026-08-13 for platform
 * consistency: every other template's Contact page carries a standard
 * contact form, and the owner wants the same here. The homepage quote form is
 * unaffected (it's a distinct, purpose-built moving-quote lead form, not a
 * duplicate of this one); the clone's three extra code-only sections
 * ("MELVYN" reasons, testimonials, gallery) are still dropped as unrelated to
 * that reversal.
 *
 * Heading copy defaults follow the SCREENSHOT, not the clone code, wherever
 * they disagree (docs/relocation/"Contact Us _ Handy Relocations.jpeg").
 * `contact.form`'s field set mirrors the sibling lead-form field pattern in
 * `homepage/index.ts` → `homepage.quote-form`.
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
    key: "relocation.contact.hero-image",
    label: "Hero Photo",
    description:
      "Optional round photo beside the hero heading. Leave blank for the text-only hero.",
    type: "image",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "relocation.contact.hero-image-alt",
    label: "Hero Photo Alt Text",
    description:
      "Read aloud by screen readers. Leave blank to treat the photo as decorative.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "",
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
    key: "relocation.contact.hours-label",
    label: "Hours Label",
    description:
      "Bold label above the opening hours. Hours come from Settings → Hours. Leave blank to show the hours with no label.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Hours",
  },
  {
    key: "relocation.contact.phone-label",
    label: "Phone Label",
    description:
      "Bold label above the phone number. The number always comes from Settings → General. Leave blank to show the number with no label.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Phone",
  },
  {
    key: "relocation.contact.email-label",
    label: "Email Label",
    description:
      "Bold label above the email address. The address comes from Settings → General. Leave blank to show the address with no label.",
    type: "text",
    page: "contact",
    group: "contact.visit",
    gridColumn: "col-span-1",
    defaultValue: "Email:",
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

// ─── contact.form ────────────────────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "relocation.contact.form-heading",
    label: "Form Heading",
    description: "Centred heading above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "SEND US A MESSAGE",
  },
  {
    key: "relocation.contact.form-name-label",
    label: "Name Label",
    description: "Label on the name box. Name is always required.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Name",
  },
  {
    key: "relocation.contact.form-email-label",
    label: "Email Label",
    description: "Label on the email box. Email is always required.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Email",
  },
  {
    key: "relocation.contact.form-email-placeholder",
    label: "Email Placeholder",
    description: "Grey hint text inside the empty email box.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Email Address",
  },
  {
    key: "relocation.contact.form-phone-label",
    label: "Phone Label",
    description: "Label on the phone box. The phone number is optional.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Mobile Phone",
  },
  {
    key: "relocation.contact.form-message-label",
    label: "Message Label",
    description: "Label on the message box. Message is always required.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Message",
  },
  {
    key: "relocation.contact.form-message-placeholder",
    label: "Message Placeholder",
    description: "Grey hint text inside the empty message box.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Tell us a little about your upcoming move…",
  },
  {
    key: "relocation.contact.form-submit-label",
    label: "Submit Button Label",
    description: "The deep terracotta button under the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send Message",
  },
  {
    key: "relocation.contact.form-success-heading",
    label: "Thank-You Heading",
    description: "Shown in place of the form once a message has been sent.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Thanks!",
  },
  {
    key: "relocation.contact.form-success-body",
    label: "Thank-You Message",
    description: "The reassurance line under the thank-you heading.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "We’ve received your message — our team will get back to you shortly.",
  },
  {
    key: "relocation.contact.form-success-again-label",
    label: "Send-Another Button Label",
    description:
      "Returns the visitor to a blank form after a successful send.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send another message",
  },
];

// ─── Aggregated exports ──────────────────────────────────────────────────────

export const relocationContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactVisitData,
  ...contactFormData,
];

export const relocationContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Hero",
    description:
      "Terracotta wave hero at the top of the Contact page: headline, welcome line, an optional round photo and the shared 'Call us today' button (Header & Branding)",
    icon: "🌊",
    columns: 2,
  },
  {
    id: "contact.visit",
    title: "Visit Us",
    description:
      "Labels above the address, hours, phone and email column beside an interactive map. The values themselves pull from Settings → General and Settings → Hours",
    icon: "📍",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact Form",
    description:
      "Heading, field labels and thank-you copy for the 'Send Us a Message' form. Submissions post through the same contact pipeline as every other template",
    icon: "✉️",
    columns: 2,
  },
];

export const relocationContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Hero",
    description:
      "Wave hero with the page headline, welcome line, an optional photo and the shared call button",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.visit",
    page: "contact",
    title: "Visit Us",
    description:
      "Address / hours / phone / email labels beside an interactive map — the values come from Settings",
    groupIds: ["contact.visit"],
    order: 1,
    hideable: true,
    links: [
      { label: "Business info", href: "/admin/settings/general" },
      { label: "Hours", href: "/admin/settings/hours" },
    ],
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Send Us a Message",
    description:
      "Name / email / phone / message form that emails the owner via the shared contact pipeline",
    groupIds: ["contact.form"],
    order: 2,
    hideable: true,
  },
];
