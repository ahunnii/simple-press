import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const servicesHeroData: TemplateField[] = [
  {
    key: "vii.services.hero-overline",
    label: "Small label",
    description: "Small label shown above the page heading in the hero.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Services",
  },
  {
    key: "vii.services.hero-heading",
    label: "Heading",
    description: "The plain part of the hero heading.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "Our",
  },
  {
    key: "vii.services.hero-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-1",
    defaultValue: "services.",
  },
  {
    key: "vii.services.hero-intro",
    label: "Intro text",
    description:
      "Optional short paragraph shown beneath the hero heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder:
      "Describe what guests will find on this page — a brief invitation to explore your services.",
  },
  {
    key: "vii.services.hero-image",
    label: "Background photo",
    description:
      "Optional full-width background photo for the hero. Leave both this and the video blank for a plain typographic hero.",
    type: "image",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii.services.hero-video",
    label: "Background video",
    description:
      "Optional background video. Takes precedence over the background photo. Leave both blank for a plain typographic hero.",
    type: "video",
    page: "services",
    group: "services.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

// ─── Intro ─────────────────────────────────────────────────────────────────────

const servicesIntroData: TemplateField[] = [
  {
    key: "vii.services.intro-overline",
    label: "Small label",
    description:
      "Small label shown above the intro heading. Leave blank to hide it.",
    type: "text",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-1",
    defaultValue: "The VII Approach",
  },
  {
    key: "vii.services.intro-heading",
    label: "Heading",
    description: "Plain part of the intro heading.",
    type: "text",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-1",
    defaultValue: "Care, crafted",
  },
  {
    key: "vii.services.intro-heading-accent",
    label: "Heading, highlighted words",
    description:
      "Shown in italics after the heading (e.g. 'around you.').",
    type: "text",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-1",
    defaultValue: "around you.",
  },
  {
    key: "vii.services.intro-body",
    label: "Body text",
    description:
      "Short inviting paragraph shown beneath the intro heading. Leave blank to hide. The whole section hides when the small label, heading, highlighted words, and this are all blank.",
    type: "textarea",
    page: "services",
    group: "services.intro",
    gridColumn: "col-span-full",
    defaultValue:
      "Every treatment begins with a conversation. Explore our full menu of services below, each designed to meet your skin exactly where it is.",
    placeholder:
      "Invite guests to explore — describe your philosophy or approach in a sentence or two.",
  },
];

// ─── Photo gallery ─────────────────────────────────────────────────────────────

const servicesGalleryData: TemplateField[] = [
  {
    key: "vii.services.gallery",
    label: "Photo gallery",
    description:
      "Pick one of your galleries to show as a closing photo strip beneath the service cards. The first images from that gallery are used. Leave empty to hide the strip.",
    type: "gallery",
    page: "services",
    group: "services.gallery",
    gridColumn: "col-span-full",
  },
];

// ─── Contact ───────────────────────────────────────────────────────────────────

const servicesCtaData: TemplateField[] = [
  {
    key: "vii.services.cta-image",
    label: "Background photo",
    description:
      "Background photo for this closing contact section, shown faded behind the overlay.",
    type: "image",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii.services.cta-heading",
    label: "Heading",
    description: "Large italic heading in this closing contact section.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Begin your ritual.",
    placeholder: "e.g. Begin your ritual.",
  },
  {
    key: "vii.services.cta-subheading",
    label: "Small label",
    description: "Small label below the heading.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. your city · By Appointment",
  },
  {
    key: "vii.services.cta-body",
    label: "Body text",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Our specialists are ready to create a personalized experience for you. Reach out to reserve your session.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii.services.cta-button-label",
    label: "Button text",
    description:
      "Text for the primary button in this section. Leave blank to hide the button.",
    type: "text",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii.services.cta-button-url",
    label: "Button link",
    description:
      "Where the button sends visitors (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii.services.cta-embed",
    label: "Booking widget",
    description:
      "Optional embed (e.g. a booking widget) shown in this section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.services.cta-embed-reveal",
    label: "Reveal booking widget behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
  {
    key: "vii.services.cta-show-phone",
    label: "Show phone number",
    description:
      "Display the business phone number in this section. Turn off for booking-only sections.",
    type: "boolean",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "vii.services.cta-show-email",
    label: "Show email",
    description:
      "Display the business email in this section. Turn off for booking-only sections.",
    type: "boolean",
    page: "services",
    group: "services.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
];

// ─── Aggregated exports ───────────────────────────────────────────────────────

export const viiServicesData: TemplateField[] = [
  ...servicesHeroData,
  ...servicesIntroData,
  ...servicesGalleryData,
  ...servicesCtaData,
];

export const viiServicesFieldGroups: TemplateFieldGroup[] = [
  {
    id: "services.hero",
    title: "Page header",
    description:
      "Small label, split heading, optional intro paragraph, and optional background photo or video for the services page hero",
    icon: "🎬",
    columns: 2,
  },
  {
    id: "services.intro",
    title: "Intro",
    description:
      "Centered small label, split heading, and paragraph shown between the hero and the service cards. Leave all fields blank to hide the section.",
    icon: "✦",
    columns: 2,
  },
  {
    id: "services.gallery",
    title: "Photo gallery",
    description:
      "Choose an existing gallery to show as a photo strip beneath the service cards. Hidden when none is selected.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "services.cta",
    title: "Contact",
    description:
      "Background photo, heading, body text, button, booking widget, and contact details for the closing contact section",
    icon: "📞",
    columns: 2,
  },
];
