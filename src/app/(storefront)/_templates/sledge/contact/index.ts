import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Contact Page ─────────────────────────────────────────────────────────────

const contactPageData: TemplateField[] = [
  {
    key: "sledge.contact-image",
    label: "Contact Hero Image",
    description: "Full-width banner image at the top of the contact page",
    type: "image",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "sledge.contact.location-heading",
    label: "Location Heading",
    description: "Heading above the shop address",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Shop Location",
  },
  {
    key: "sledge.contact.location-note",
    label: "Location Note",
    description: "Secondary text below the shop address",
    type: "textarea",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue:
      "Purchases may be picked up at location or shipped out. Please call for hours.",
  },
  {
    key: "sledge.contact.email-heading",
    label: "Email Heading",
    description: "Heading above the support email",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Email Address",
  },
  {
    key: "sledge.contact.phone-heading",
    label: "Phone Heading",
    description: "Heading above the phone number",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Phone Number",
  },
  {
    key: "sledge.contact.form-title",
    label: "Form Title",
    description: "Heading shown on the contact form card",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Send Us A Message",
  },
  {
    key: "sledge.contact.trending-heading",
    label: "Trending Section Heading",
    description: "Heading for the product rail below the contact form",
    type: "text",
    page: "contact",
    group: "contact.info",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
];

// ─── Testimonials Page ────────────────────────────────────────────────────────

const testimonialsPageData: TemplateField[] = [
  {
    key: "sledge.testimonials.page-heading",
    label: "Page Heading",
    description: "Large heading at the top of the testimonials page",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Testimonials",
  },
  {
    key: "sledge.testimonials.page-intro",
    label: "Page Intro",
    description: "Short line shown below the page heading",
    type: "textarea",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "Check out what our customers have been saying about us!",
  },
  {
    key: "sledge.testimonials.trending-heading",
    label: "Trending Section Heading",
    description: "Heading for the product rail below the testimonials",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-1",
    defaultValue: "Trending Now",
  },
  {
    key: "sledge.testimonials.empty-state-text",
    label: "Empty State Text",
    description: "Text shown when there are no testimonials yet",
    type: "text",
    page: "testimonials",
    group: "testimonials.page",
    gridColumn: "col-span-full",
    defaultValue: "No testimonials yet. Check back soon.",
  },
];

export const sledgeContactData = [...contactPageData, ...testimonialsPageData];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const sledgeContactFieldGroups: TemplateFieldGroup[] = [
  {
    id: "contact.info",
    title: "Contact Page",
    description:
      "Hero image, contact info headings, form title, and trending section",
    icon: "📧",
    columns: 2,
  },
  {
    id: "testimonials.page",
    title: "Testimonials Page",
    description: "Heading, intro, trending section, and empty state",
    icon: "💬",
    columns: 2,
  },
];
