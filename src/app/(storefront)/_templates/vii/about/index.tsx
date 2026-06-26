import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "vii.about.hero-image",
    label: "Hero Background Image",
    description:
      "Full-width banner image at the top of the About page. Use a high-quality landscape photo.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.hero-overline",
    label: "Hero Overline",
    description: "Small uppercase label shown above the page title.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII — Detroit",
  },
  {
    key: "vii.about.hero-heading",
    label: "Hero Heading",
    description: "The main page title overlaid on the hero image.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "About Us",
  },
];

// ─── Mission (centered) ───────────────────────────────────────────────────────

const aboutMissionData: TemplateField[] = [
  {
    key: "vii.about.mission-overline",
    label: "Mission Overline",
    description: "Small uppercase label above the mission heading.",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "Wellness Redefined",
  },
  {
    key: "vii.about.mission-heading",
    label: "Mission Heading",
    description:
      "The plain part of the two-part mission heading (e.g. 'A new sense of').",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "A new sense of",
  },
  {
    key: "vii.about.mission-heading-accent",
    label: "Mission Heading Accent Word",
    description:
      "The italic copper accent word completing the mission heading (e.g. 'skin').",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "skin",
  },
  {
    key: "vii.about.mission-body",
    label: "Mission Body Text",
    description:
      "Opening paragraph introducing the studio, its mission, and what makes it different.",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "Tucked into the heart of Detroit, Skinbar VII is a modern facial studio built on a simple belief: great skin is the result of great care. We pair clinical expertise with a slower, more intentional approach — taking the time to understand your skin, your goals, and the rituals that keep you glowing long after you leave. Every treatment is personalized, every product purposeful, and every visit a moment to exhale.",
  },
];

// ─── Facial Steps ─────────────────────────────────────────────────────────────

const aboutStepsData: TemplateField[] = [
  {
    key: "vii.about.steps-overline",
    label: "Steps Overline",
    description: "Small uppercase label above the facial-steps heading.",
    type: "text",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-1",
    defaultValue: "The Ritual",
  },
  {
    key: "vii.about.steps-heading",
    label: "Steps Heading",
    description:
      "The plain part of the facial-steps heading (e.g. 'Your facial, step by').",
    type: "text",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-1",
    defaultValue: "Your facial, step by",
  },
  {
    key: "vii.about.steps-heading-accent",
    label: "Steps Heading Accent Word",
    description:
      "The italic copper accent word completing the steps heading (e.g. 'step').",
    type: "text",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-1",
    defaultValue: "step",
  },
  {
    key: "vii.about.steps-intro",
    label: "Steps Intro Text",
    description:
      "Short paragraph introducing the six-step facial below the heading.",
    type: "textarea",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-full",
    defaultValue:
      "Every signature facial follows the same considered ritual — six steps designed to cleanse, renew, and restore your skin from the first touch to the final glow.",
  },
  {
    key: "vii.about.steps",
    label: "Facial Steps",
    description:
      "The steps of your signature facial, each shown as an alternating image-and-text row. Up to 6 steps. Leave empty to use the built-in example steps.",
    type: "list",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Step Image",
        type: "image",
        placeholder: "Upload an image for this step",
      },
      {
        key: "title",
        label: "Step Title",
        type: "text",
        placeholder: "e.g. Cleanse",
      },
      {
        key: "body",
        label: "Step Description",
        type: "textarea",
        placeholder: "Describe what happens during this step",
      },
    ],
  },
];

// ─── Atmospheric Band ─────────────────────────────────────────────────────────

const aboutBandData: TemplateField[] = [
  {
    key: "vii.about.band-image",
    label: "Band Background Image",
    description:
      "Full-width image behind the brand statement. A calm, atmospheric photo works best.",
    type: "image",
    page: "about",
    group: "about.band",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.band-label",
    label: "Band Label",
    description: "Small uppercase label shown above the statement (optional).",
    type: "text",
    page: "about",
    group: "about.band",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII",
  },
  {
    key: "vii.about.band-statement",
    label: "Band Statement",
    description:
      "A short, evocative brand statement shown over the dark image band. Leave empty to hide this section.",
    type: "textarea",
    page: "about",
    group: "about.band",
    gridColumn: "col-span-full",
    defaultValue:
      "Skin you feel confident in — through honest guidance, gentle expertise, and treatments that work with your skin, never against it.",
  },
];

// ─── Meet the Team: Owner Spotlight ───────────────────────────────────────────

const aboutOwnerData: TemplateField[] = [
  {
    key: "vii.about.owner-overline",
    label: "Owner Overline",
    description: "Small uppercase label above the owner heading.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Meet the Team",
  },
  {
    key: "vii.about.owner-heading",
    label: "Owner Heading",
    description: "The plain part of the owner heading (e.g. 'Meet').",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Meet",
  },
  {
    key: "vii.about.owner-heading-accent",
    label: "Owner Name (Accent)",
    description:
      "The italic copper accent word completing the heading — typically the owner's name (e.g. 'Simone').",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Simone",
  },
  {
    key: "vii.about.owner-role",
    label: "Owner Role",
    description:
      "The owner's title or credentials (e.g. 'Founder & Lead Esthetician').",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Founder & Lead Esthetician",
  },
  {
    key: "vii.about.owner-body",
    label: "Owner Bio",
    description:
      "A paragraph introducing the owner — their story, expertise, and what they bring to your skin.",
    type: "textarea",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue:
      "Skinbar VII began with a single belief: that everyone deserves to feel at home in their own skin. After more than a decade behind the treatment table, Simone built the studio she always wished existed — one rooted in education over upsell, calm over rush, and results that last. She leads every consultation personally, and treats each face like the one-of-a-kind canvas it is.",
  },
  {
    key: "vii.about.owner-image",
    label: "Owner Portrait",
    description: "A portrait photo of the owner (shown in the right column).",
    type: "image",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
  },
];

// ─── Meet the Team: Grid ──────────────────────────────────────────────────────

const aboutTeamData: TemplateField[] = [
  {
    key: "vii.about.team-overline",
    label: "Team Overline",
    description:
      "Small uppercase label above the team grid heading (optional).",
    type: "text",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-1",
    defaultValue: "The Studio",
  },
  {
    key: "vii.about.team-heading",
    label: "Team Heading",
    description: "Heading for the team grid section.",
    type: "text",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-1",
    defaultValue: "The team behind your glow",
  },
  {
    key: "vii.about.team-intro",
    label: "Team Intro Text",
    description: "Short paragraph introducing the team grid below (optional).",
    type: "textarea",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-full",
    defaultValue:
      "Every member of our team is licensed, endlessly curious, and genuinely invested in your skin. Get to know the faces you'll see at your next visit.",
  },
  {
    key: "vii.about.team",
    label: "Team Members",
    description:
      "Your estheticians and staff, shown as a grid of cards. Leave empty to use the built-in example team.",
    type: "list",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-full",
    maxItems: 8,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        placeholder: "Upload a portrait photo",
      },
      {
        key: "name",
        label: "Name",
        type: "text",
        placeholder: "e.g. Maya Brooks",
      },
      {
        key: "role",
        label: "Role",
        type: "text",
        placeholder: "e.g. Licensed Esthetician",
      },
      {
        key: "bio",
        label: "Short Bio",
        type: "textarea",
        placeholder: "A sentence or two about this team member (optional)",
      },
    ],
  },
];

// ─── Contact CTA ──────────────────────────────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "vii.about.cta-image",
    label: "CTA Background Image",
    description: "Dark background image behind the closing contact section.",
    type: "image",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.cta-heading",
    label: "CTA Heading",
    description: "Large italic heading for the closing contact section.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "vii.about.cta-subheading",
    label: "CTA Subheading",
    description: "Small uppercase label below the CTA heading.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ready to glow?",
  },
  {
    key: "vii.about.cta-body",
    label: "CTA Body Text",
    description: "Short invitation to book or reach out.",
    type: "textarea",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Whether you're booking your first facial or returning for your monthly ritual, we'd love to take care of you. Reach out to ask a question or reserve your spot.",
  },
  {
    key: "vii.about.cta-button-label",
    label: "Button Label",
    description:
      "Text for the primary call-to-action button. Leave empty to hide the button.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a Facial",
  },
  {
    key: "vii.about.cta-button-link",
    label: "Button Link",
    description:
      "Where the button sends visitors — your services page or an external booking link (e.g. Vagaro).",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  {
    key: "vii.about.cta-phone",
    label: "Phone Number",
    description: "Phone number displayed in the contact section.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    placeholder: "e.g. +1 (313) 555-0100",
  },
  {
    key: "vii.about.cta-email",
    label: "Contact Email",
    description: "Email address displayed in the contact section.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    placeholder: "e.g. hello@skinbarvii.com",
  },
  {
    key: "vii.about.cta-show-phone",
    label: "Show phone number in this section",
    description:
      "Display the phone number above in the contact section. Turn off for booking-only CTAs.",
    type: "boolean",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "vii.about.cta-show-email",
    label: "Show email in this section",
    description:
      "Display the email above in the contact section. Turn off for booking-only CTAs.",
    type: "boolean",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const viiAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutMissionData,
  ...aboutStepsData,
  ...aboutBandData,
  ...aboutOwnerData,
  ...aboutTeamData,
  ...aboutCtaData,
];

// ─── Field Groups ─────────────────────────────────────────────────────────────

export const viiAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "About Hero",
    description: "Full-width banner image with overline and page title",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission Statement",
    description:
      "Centered two-part heading and opening paragraph introducing the studio",
    icon: "✨",
    columns: 2,
  },
  {
    id: "about.steps",
    title: "Facial Steps",
    description:
      "Heading, intro, and the alternating image-and-text rows for your six-step facial",
    icon: "💆",
    columns: 2,
  },
  {
    id: "about.band",
    title: "Brand Statement Band",
    description:
      "Dark image band with a short, evocative brand statement overlaid",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.owner",
    title: "Meet the Owner",
    description:
      "Two-column owner spotlight: heading, role, bio, and a portrait photo",
    icon: "👤",
    columns: 2,
  },
  {
    id: "about.team",
    title: "Meet the Team",
    description: "Heading, intro, and a grid of your estheticians and staff",
    icon: "🧑‍🤝‍🧑",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "Closing Contact CTA",
    description:
      "Dark contact section with heading, body, a booking button, phone, and email",
    icon: "📞",
    columns: 2,
  },
];
