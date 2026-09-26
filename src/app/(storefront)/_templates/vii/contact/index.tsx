import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "vii.contact.hero-image",
    label: "Background photo",
    description:
      "Full-width banner photo at the top of the contact page. Use a high-quality landscape photo.",
    type: "image",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.contact.hero-overline",
    label: "Small label",
    description: "Small label shown above the page title. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII — Detroit",
  },
  {
    key: "vii.contact.hero-heading",
    label: "Heading",
    description: "The main page title overlaid on the banner photo.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
  },
];

// ─── Intro and contact details ────────────────────────────────────────────────

const contactMainData: TemplateField[] = [
  {
    key: "vii.contact.intro-overline",
    label: "Small label",
    description: "Small label above the intro heading. Leave blank to hide.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "vii.contact.intro-heading",
    label: "Heading",
    description:
      "The plain part of the intro heading (e.g. 'We'd love to hear').",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "We'd love to hear",
  },
  {
    key: "vii.contact.intro-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "from you",
  },
  {
    key: "vii.contact.intro-body",
    label: "Body text",
    description:
      "Short paragraph inviting visitors to reach out, ask a question, or book. Leave blank to hide.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Whether you're booking your first facial, planning your next visit, or simply have a question about your skin — we're here and happy to help. Drop us a message and we'll get back to you, usually within one business day.",
  },
  {
    key: "vii.contact.form-heading",
    label: "Form heading",
    description: "Heading shown above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Send a message",
  },
];

// ─── Contact form ─────────────────────────────────────────────────────────────

const contactFormData: TemplateField[] = [
  {
    key: "vii.contact.form-success-heading",
    label: "Success heading",
    description:
      "Heading shown after someone sends the contact form, in place of the form.",
    type: "text",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-1",
    defaultValue: "Message sent",
    placeholder: "Message sent",
  },
  {
    key: "vii.contact.form-success-body",
    label: "Success message",
    description:
      "Line shown under the success heading after someone sends the contact form.",
    type: "textarea",
    page: "contact",
    group: "contact.form",
    gridColumn: "col-span-full",
    defaultValue: "We'll be in touch shortly.",
    placeholder: "We'll be in touch shortly.",
  },
];

// ─── Map ──────────────────────────────────────────────────────────────────────

const contactMapData: TemplateField[] = [
  {
    key: "vii.contact.map-heading",
    label: "Heading",
    description: "Small heading shown above the map.",
    type: "text",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-1",
    defaultValue: "Find us in Detroit",
  },
];

// ─── Leave a review ───────────────────────────────────────────────────────────

const contactReviewData: TemplateField[] = [
  {
    key: "vii.contact.review-heading",
    label: "Heading",
    description:
      "The plain part of the review-prompt heading (e.g. 'Loved your visit?').",
    type: "text",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    defaultValue: "Loved your visit?",
  },
  {
    key: "vii.contact.review-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    defaultValue: "Tell the world",
  },
  {
    key: "vii.contact.review-body",
    label: "Body text",
    description: "Short note asking happy clients to leave a review.",
    type: "textarea",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-full",
    defaultValue:
      "Your words mean the world to us — and they help other Detroiters discover their new favorite facial. If you enjoyed your time at Skinbar VII, we'd be so grateful if you'd share it.",
  },
  {
    key: "vii.contact.review-google-url",
    label: "Google reviews link",
    description:
      "Link to your Google reviews page. Leave blank to hide the Google button.",
    type: "url",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    placeholder: "https://g.page/r/...",
  },
  {
    key: "vii.contact.review-facebook-url",
    label: "Facebook reviews link",
    description:
      "Link to your Facebook reviews page. Leave blank to hide the Facebook button.",
    type: "url",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    placeholder: "https://facebook.com/.../reviews",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const viiContactData: TemplateField[] = [
  ...contactHeroData,
  ...contactMainData,
  ...contactFormData,
  ...contactMapData,
  ...contactReviewData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Page header",
    description: "Full-width banner photo with a small label and page title",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.main",
    title: "Intro and contact details",
    description:
      "Two-part heading, invitation text, and the contact form heading",
    icon: "💬",
    columns: 2,
  },
  {
    id: "contact.form",
    title: "Contact form",
    description: "Message shown after someone sends the contact form.",
    icon: "📨",
    columns: 2,
  },
  {
    id: "contact.map",
    title: "Map",
    description:
      "An interactive map of your location, with links to open it in Google Maps. The pin comes from Settings → General.",
    icon: "📍",
    columns: 2,
  },
  {
    id: "contact.review",
    title: "Leave a review",
    description:
      "Section inviting happy clients to leave a Google or Facebook review",
    icon: "⭐",
    columns: 2,
  },
];
