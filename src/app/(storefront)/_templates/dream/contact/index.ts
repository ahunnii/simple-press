import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { SECTION_LINKS } from "~/lib/section-links";

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
    label: "Heading",
    description: "The page's H1, before the highlighted words.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Request an",
  },
  {
    key: "dream.contact.hero-accent",
    label: "Highlighted words",
    description: "Script-styled phrase after the heading.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.contact.hero-lede",
    label: "Intro",
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
    label: "Heading",
    description: "Heading above the quote form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Tell Selest about your event",
  },
  {
    key: "dream.contact.form-intro",
    label: "Intro",
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
    label: "Theme description helper text",
    description: "Short helper line shown under the Theme description field.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "Describe the mood, colors, and any inspiration you have in mind.",
  },
  {
    key: "dream.contact.form-submit-label",
    label: "Submit button label",
    description: "Label for the form's submit button.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Send Estimate Quote Request",
  },
  {
    key: "dream.contact.form-success-heading",
    label: "Success heading",
    description: "Heading shown after a request sends successfully.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Your request is with Selest",
  },
  {
    key: "dream.contact.form-success-body",
    label: "Success message",
    description: "Short line shown after a request sends successfully.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "She'll review the details and follow up soon.",
  },
  {
    key: "dream.contact.form-next-heading",
    label: "What happens next heading",
    description: "Heading for the panel beside the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "What happens next",
  },
  {
    key: "dream.contact.form-next-step-1-heading",
    label: "Step 1 heading",
    description: "Heading for the first step in the panel beside the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Selest reviews your details",
  },
  {
    key: "dream.contact.form-next-step-1-body",
    label: "Step 1 body",
    description: "Short line for the first step in the panel beside the form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue:
      "She looks over the event, the space, and the theme you described.",
  },
  {
    key: "dream.contact.form-next-step-2-heading",
    label: "Step 2 heading",
    description: "Heading for the second step in the panel beside the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "You get a proposal",
  },
  {
    key: "dream.contact.form-next-step-2-body",
    label: "Step 2 body",
    description: "Short line for the second step in the panel beside the form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "A plan with the pieces, colors, and pricing for your event.",
  },
  {
    key: "dream.contact.form-next-step-3-heading",
    label: "Step 3 heading",
    description: "Heading for the third step in the panel beside the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "You lock in your date",
  },
  {
    key: "dream.contact.form-next-step-3-body",
    label: "Step 3 body",
    description: "Short line for the third step in the panel beside the form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Approve the plan and Selest reserves your date.",
  },
  {
    key: "dream.contact.form-draping-label",
    label: "Draping question label",
    description:
      "Label for the draping yes/no question in the quote form. Leave blank to hide the question.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Draping",
  },
  {
    key: "dream.contact.form-throne-label",
    label: "Throne chair question label",
    description:
      "Label for the throne chair yes/no question in the quote form. Leave blank to hide the question.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Throne chair",
  },
  {
    key: "dream.contact.form-full-decor-label",
    label: "Full decor question label",
    description:
      "Label for the full decor yes/no question in the quote form (always required while shown). Leave blank to hide the question.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Full decor by Dream Your Theme",
  },
  {
    key: "dream.contact.form-full-decor-error",
    label: "Full decor required message",
    description: "Message shown if the full decor question is left unanswered.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "Let Selest know if you'd like full decor.",
  },
];

// ─── Info — hideable (email/phone/hours/service-area are global fields) ────

const contactInfoData: TemplateField[] = [
  {
    key: "dream.contact.info-heading",
    label: "Heading",
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
    title: "Page header",
    description: "Heading, highlighted words, and intro",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Quote form",
    description:
      'Form heading/intro, theme description helper text, submit label, success copy, and the "what happens next" steps',
    icon: "📝",
    columns: 2,
  },
  {
    id: "contact.info",
    title: "Contact info",
    description: "Heading above the email/phone/hours/service-area lines",
    icon: "📍",
    columns: 2,
  },
];

export const dreamContactSections: TemplateSection[] = [
  {
    id: "contact.hero",
    page: "contact",
    title: "Page header",
    description: "Logo, heading, and intro",
    groupIds: ["contact.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "contact.form",
    page: "contact",
    title: "Quote form",
    description: 'The quote form and its "what happens next" panel',
    groupIds: ["contact.form"],
    order: 1,
    hideable: false,
  },
  {
    id: "contact.info",
    page: "contact",
    title: "Contact info",
    description:
      "Your heading, plus email, phone, and hours from Settings and your service area — hidden when all are blank",
    groupIds: ["contact.info"],
    links: [SECTION_LINKS.businessContact, SECTION_LINKS.businessHours],
    order: 2,
    hideable: true,
  },
];
