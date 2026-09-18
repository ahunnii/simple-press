import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * Estimate Quote (ContactPage slot, `/contact`) — design.md "Per-page
 * section concepts › Estimate Quote". Three sections: hero (not hideable),
 * form (not hideable — gated on the platform `contactForm` flag instead),
 * info (hideable — email/phone/hours/service-area come from the
 * `global.branding` fields already defined in the template root; this
 * group only owns the section's own heading).
 */

// ─── Hero — NOT hideable ────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "dream.contact.hero-heading",
    label: "Page Heading",
    description: "The page's H1, before the script accent word.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream.contact.hero-accent",
    label: "Page Heading Accent",
    description: "Script phrase rendered in rose after the heading.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.contact.hero-lede",
    label: "Page Lede",
    description: "Short line under the page heading.",
    type: "textarea",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "Give Selest the details she needs to understand the event and recommend the right setup.",
  },
];

// ─── Form — NOT hideable (gated on the platform contactForm flag) ──────────

const contactFormData: TemplateField[] = [
  {
    key: "dream.contact.form-heading",
    label: "Form Heading",
    description: "Heading above the Estimate Quote form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Tell Selest about your event",
  },
  {
    key: "dream.contact.form-intro",
    label: "Form Intro",
    description: "Short line under the form heading. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "The more detail you share, the closer her first proposal will be.",
  },
  {
    key: "dream.contact.form-theme-helper",
    label: "Theme Description — Helper Text",
    description: "Short helper line shown under the Theme Description field.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Describe the mood, colors, and any inspiration you have in mind.",
  },
  {
    key: "dream.contact.form-submit-label",
    label: "Submit Button Label",
    description: "Label for the form's submit button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send Estimate Quote Request",
  },
  {
    key: "dream.contact.form-success-heading",
    label: "Success Heading",
    description: "Heading shown after a request sends successfully.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Your request is with Selest",
  },
  {
    key: "dream.contact.form-success-body",
    label: "Success Body",
    description: "Short line shown after a request sends successfully.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "She'll review the details and follow up soon.",
  },
  {
    key: "dream.contact.form-next-heading",
    label: '"What Happens Next" Heading',
    description: "Heading for the sticky aside next to the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "What happens next",
  },
  {
    key: "dream.contact.form-next-step-1-heading",
    label: "Next Step 1 — Heading",
    description: 'First "what happens next" step heading.',
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Selest reviews your details",
  },
  {
    key: "dream.contact.form-next-step-1-body",
    label: "Next Step 1 — Body",
    description: 'First "what happens next" step body.',
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "She looks over the event, the space, and the theme you described.",
  },
  {
    key: "dream.contact.form-next-step-2-heading",
    label: "Next Step 2 — Heading",
    description: 'Second "what happens next" step heading.',
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "You get a proposal",
  },
  {
    key: "dream.contact.form-next-step-2-body",
    label: "Next Step 2 — Body",
    description: 'Second "what happens next" step body.',
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "A plan with the pieces, colors, and pricing for your event.",
  },
  {
    key: "dream.contact.form-next-step-3-heading",
    label: "Next Step 3 — Heading",
    description: 'Third "what happens next" step heading.',
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "You lock in your date",
  },
  {
    key: "dream.contact.form-next-step-3-body",
    label: "Next Step 3 — Body",
    description: 'Third "what happens next" step body.',
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Approve the plan and Selest reserves your date.",
  },
];

// ─── Info — hideable (email/phone/hours/service-area are global fields) ────

const contactInfoData: TemplateField[] = [
  {
    key: "dream.contact.info-heading",
    label: "Contact Info Heading",
    description: "Heading above the email/phone/hours/service-area lines.",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "Get in touch",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const dreamContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactFormData,
  ...contactInfoData,
];

export const dreamContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Page Hero",
    description: "Heading, script accent, and lede",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Estimate Quote Form",
    description:
      'Form heading/intro, theme-description helper text, submit label, success copy, and the "what happens next" steps',
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact Info",
    description: "Heading above the email/phone/hours/service-area lines",
    icon: "📍",
    columns: 2,
  },
];

export const dreamContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Page Hero",
    description: "Logo, heading, and lede",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Estimate Quote Form",
    description: 'The Estimate Quote form and its "what happens next" aside',
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.info",
    page: "contact",
    title: "Contact Info",
    description: "Email, phone, hours, and service area",
    groupIds: ["contact.info"],
    order: 2,
    hideable: true,
  },
];
