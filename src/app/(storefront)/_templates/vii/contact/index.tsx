import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const contactHeroData: TemplateField[] = [
  {
    key: "vii.contact.hero-image",
    label: "Hero Background Image",
    description:
      "Full-width banner image at the top of the Contact page. Use a high-quality landscape photo.",
    type: "image",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.contact.hero-overline",
    label: "Hero Overline",
    description: "Small uppercase label shown above the page title.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII — Detroit",
  },
  {
    key: "vii.contact.hero-heading",
    label: "Hero Heading",
    description: "The main page title overlaid on the hero image.",
    type: "text",
    page: "contact",
    group: "contact.hero",
    gridColumn: "col-span-1",
    defaultValue: "Contact Us",
  },
];

// ─── Main (intro + form) ──────────────────────────────────────────────────────

const contactMainData: TemplateField[] = [
  {
    key: "vii.contact.intro-overline",
    label: "Intro Overline",
    description: "Small uppercase label above the intro heading.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
  },
  {
    key: "vii.contact.intro-heading",
    label: "Intro Heading",
    description:
      "The plain part of the two-part intro heading (e.g. 'We'd love to hear').",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "We'd love to hear",
  },
  {
    key: "vii.contact.intro-heading-accent",
    label: "Intro Heading Accent Word",
    description:
      "The italic copper accent words completing the intro heading (e.g. 'from you').",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "from you",
  },
  {
    key: "vii.contact.intro-body",
    label: "Intro Body Text",
    description:
      "Short paragraph inviting visitors to reach out, ask a question, or book a treatment.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue:
      "Whether you're booking your first facial, planning your next visit, or simply have a question about your skin — we're here and happy to help. Drop us a message and we'll get back to you, usually within one business day.",
  },
  {
    key: "vii.contact.hours",
    label: "Opening Hours",
    description:
      "Studio hours shown beside your address and contact details. One day or range per line.",
    type: "textarea",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-full",
    defaultValue: "Tuesday – Saturday: 10am – 6pm\nSunday & Monday: Closed",
  },
  {
    key: "vii.contact.form-heading",
    label: "Form Heading",
    description: "Heading shown above the contact form.",
    type: "text",
    page: "contact",
    group: "contact.main",
    gridColumn: "col-span-1",
    defaultValue: "Send a message",
  },
];

// ─── Map ──────────────────────────────────────────────────────────────────────

const contactMapData: TemplateField[] = [
  {
    key: "vii.contact.map-heading",
    label: "Map Heading",
    description: "Small heading shown above the location map.",
    type: "text",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-1",
    defaultValue: "Find us in Detroit",
  },
  {
    key: "vii.contact.map-image",
    label: "Map Image",
    description:
      "A static map screenshot of your location. Clicking it opens Google Maps with your business address. Leave empty to hide the map section.",
    type: "image",
    page: "contact",
    group: "contact.map",
    gridColumn: "col-span-full",
  },
];

// ─── Leave a Review ───────────────────────────────────────────────────────────

const contactReviewData: TemplateField[] = [
  {
    key: "vii.contact.review-heading",
    label: "Review Heading",
    description: "The plain part of the review-prompt heading (e.g. 'Loved your visit?').",
    type: "text",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    defaultValue: "Loved your visit?",
  },
  {
    key: "vii.contact.review-heading-accent",
    label: "Review Heading Accent Word",
    description:
      "The italic accent words completing the review heading (e.g. 'Tell the world').",
    type: "text",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    defaultValue: "Tell the world",
  },
  {
    key: "vii.contact.review-body",
    label: "Review Body Text",
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
    label: "Google Reviews URL",
    description:
      "Link to your Google reviews page. Leave empty to hide the Google button.",
    type: "url",
    page: "contact",
    group: "contact.review",
    gridColumn: "col-span-1",
    placeholder: "https://g.page/r/...",
  },
  {
    key: "vii.contact.review-facebook-url",
    label: "Facebook Reviews URL",
    description:
      "Link to your Facebook reviews page. Leave empty to hide the Facebook button.",
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
  ...contactMapData,
  ...contactReviewData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.hero",
    title: "Contact Hero",
    description: "Full-width banner image with overline and page title",
    icon: "✉️",
    columns: 2,
  },
  {
    id: "contact.main",
    title: "Intro & Form",
    description:
      "Two-part heading, invitation text, opening hours, and the contact form heading",
    icon: "💬",
    columns: 2,
  },
  {
    id: "contact.map",
    title: "Location Map",
    description:
      "A static map image that links to your address on Google Maps. Leave the image empty to hide it.",
    icon: "📍",
    columns: 2,
  },
  {
    id: "contact.review",
    title: "Leave a Review",
    description:
      "Dark section inviting happy clients to leave a Google or Facebook review",
    icon: "⭐",
    columns: 2,
  },
];
