import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const servicesHeroData: TemplateField[] = [
  {
    key: "vii.services.hero-overline",
    label: "Hero Overline",
    description:
      "Small all-caps eyebrow text shown above the page heading in the hero.",
    type: "text",
    page: "services",
    group: "vii.services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Services",
  },
  {
    key: "vii.services.hero-heading",
    label: "Hero Heading",
    description: "The plain part of the two-part hero heading.",
    type: "text",
    page: "services",
    group: "vii.services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our",
  },
  {
    key: "vii.services.hero-heading-accent",
    label: "Hero Heading Accent",
    description:
      "The italic copper accent word completing the hero heading (renders italic copper).",
    type: "text",
    page: "services",
    group: "vii.services.hero",
    gridColumn: "col-span-1",
    defaultValue: "services.",
  },
  {
    key: "vii.services.hero-intro",
    label: "Hero Intro",
    description: "Optional short paragraph shown beneath the hero heading.",
    type: "textarea",
    page: "services",
    group: "vii.services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder:
      "Describe what guests will find on this page — a brief invitation to explore your services.",
  },
  {
    key: "vii.services.hero-image",
    label: "Hero Image",
    description:
      "Optional full-width background image for the hero. Leave blank for a cream typographic hero.",
    type: "image",
    page: "services",
    group: "vii.services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii.services.hero-video",
    label: "Hero Video",
    description:
      "Optional background video (MP4). Takes precedence over the hero image. Leave both blank for a cream typographic hero.",
    type: "video",
    page: "services",
    group: "vii.services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── Closing Gallery Strip ─────────────────────────────────────────────────────

const servicesGalleryData: TemplateField[] = [
  {
    key: "vii.services.gallery",
    label: "Closing Gallery Strip",
    description:
      "Pick one of your galleries to show as a closing photo strip beneath the service cards. The first images from that gallery are used. Leave empty to hide the strip.",
    type: "gallery",
    page: "services",
    group: "vii.services.gallery",
    gridColumn: "col-span-full",
  },
];

// ─── Closing Call to Action ────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "vii.services.cta-image",
    label: "Closing CTA Image",
    description:
      "Background image for the closing contact CTA section (shown at 30% opacity behind the navy overlay).",
    type: "image",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii.services.cta-heading",
    label: "Closing CTA Heading",
    description: "Large italic serif heading in the closing CTA block.",
    type: "text",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Begin your ritual.",
    placeholder: "e.g. Begin your ritual.",
  },
  {
    key: "vii.services.cta-subheading",
    label: "Closing CTA Subheading",
    description: "Small all-caps line below the heading.",
    type: "text",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. Detroit · By Appointment",
  },
  {
    key: "vii.services.cta-body",
    label: "Closing CTA Body",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Our specialists are ready to create a personalized experience for you. Reach out to reserve your session.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii.services.cta-button-label",
    label: "Closing CTA Button Label",
    description:
      "Label for the primary action button in the closing CTA. Leave blank to hide the button.",
    type: "text",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii.services.cta-button-url",
    label: "Closing CTA Button URL",
    description:
      "URL the CTA button links to (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii.services.cta-embed",
    label: "Closing CTA Embed",
    description:
      "Optional embed (e.g. a booking widget) shown in the closing CTA section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.services.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
  {
    key: "vii.services.cta-show-phone",
    label: "Show phone number in this section",
    description:
      "Display the business phone number in the closing CTA. Turn off for booking-only CTAs.",
    type: "boolean",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "vii.services.cta-show-email",
    label: "Show email in this section",
    description:
      "Display the business email in the closing CTA. Turn off for booking-only CTAs.",
    type: "boolean",
    page: "services",
    group: "vii.services.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
];

// ─── Aggregated exports ───────────────────────────────────────────────────────

export const viiServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesGalleryData,
  ...servicesCtaData,
];

export const viiServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii.services.hero",
    title: "Hero",
    description:
      "Overline, split heading, optional intro paragraph, and optional background image or video for the services index hero",
    icon: "🎬",
    columns: 2,
  },
  {
    id: "vii.services.gallery",
    title: "Closing Gallery Strip",
    description:
      "Choose an existing gallery to show as a photo strip beneath the service cards. Hidden when none is selected.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "vii.services.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, button, embed, and contact details for the closing navy CTA section",
    icon: "📞",
    columns: 2,
  },
];
