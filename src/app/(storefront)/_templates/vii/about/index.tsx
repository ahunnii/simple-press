import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

// ─── Hero ─────────────────────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "vii.about.hero-image",
    label: "Background photo",
    description:
      "Full-width banner photo at the top of the about page. Use a high-quality landscape photo.",
    type: "image",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.hero-overline",
    label: "Small label",
    description: "Small label shown above the page title. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII — Detroit",
  },
  {
    key: "vii.about.hero-heading",
    label: "Heading",
    description: "The main page title overlaid on the banner photo.",
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
    label: "Small label",
    description: "Small label above the mission heading.",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "Wellness Redefined",
  },
  {
    key: "vii.about.mission-heading",
    label: "Heading",
    description:
      "The plain part of the mission heading (e.g. 'A new sense of').",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "A new sense of",
  },
  {
    key: "vii.about.mission-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "skin",
  },
  {
    key: "vii.about.mission-body",
    label: "Body text",
    description:
      "Opening paragraph introducing the business, its mission, and what makes it different. Leave blank to hide.",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "Tucked into the heart of Detroit, Skinbar VII is a modern facial studio built on a simple belief: great skin is the result of great care. We pair clinical expertise with a slower, more intentional approach — taking the time to understand your skin, your goals, and the rituals that keep you glowing long after you leave. Every treatment is personalized, every product purposeful, and every visit a moment to exhale.",
  },
];

// ─── Steps ─────────────────────────────────────────────────────────────────

const aboutStepsData: TemplateField[] = [
  {
    key: "vii.about.steps-overline",
    label: "Small label",
    description: "Small label above the steps heading.",
    type: "text",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-1",
    defaultValue: "The Ritual",
  },
  {
    key: "vii.about.steps-heading",
    label: "Heading",
    description:
      "The plain part of the steps heading (e.g. 'Your facial, step by').",
    type: "text",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-1",
    defaultValue: "Your facial, step by",
  },
  {
    key: "vii.about.steps-heading-accent",
    label: "Heading, highlighted words",
    description: "Shown in italics after the heading.",
    type: "text",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-1",
    defaultValue: "step",
  },
  {
    key: "vii.about.steps-intro",
    label: "Intro text",
    description: "Short paragraph introducing the steps below the heading.",
    type: "textarea",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-full",
    defaultValue:
      "Every signature facial follows the same considered ritual — six steps designed to cleanse, renew, and restore your skin from the first touch to the final glow.",
  },
  {
    key: "vii.about.steps",
    label: "Steps",
    description:
      "Each step is shown as an alternating photo-and-text row. Up to 6 steps. Shows built-in example steps when this list is empty.",
    type: "list",
    page: "about",
    group: "about.steps",
    gridColumn: "col-span-full",
    itemLabel: "step",
    defaultsWhenEmpty: true,
    maxItems: 6,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Photo for this step. Shows a plain color fill when blank.",
        placeholder: "Upload a photo for this step",
        optional: true,
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short name for this step.",
        placeholder: "e.g. Cleanse",
      },
      {
        key: "body",
        label: "Description",
        type: "textarea",
        description: "A sentence or two describing this step. Leave blank to hide.",
        placeholder: "Describe what happens during this step",
        optional: true,
      },
    ],
  },
];

// ─── Statement banner ─────────────────────────────────────────────────────────

const aboutBandData: TemplateField[] = [
  {
    key: "vii.about.band-image",
    label: "Background photo",
    description:
      "Full-width photo behind the statement below. A calm, atmospheric photo works best.",
    type: "image",
    page: "about",
    group: "about.band",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.band-label",
    label: "Small label",
    description: "Small label shown above the statement. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.band",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII",
  },
  {
    key: "vii.about.band-statement",
    label: "Statement",
    description:
      "A short, evocative statement shown over the banner photo. Leave blank to hide this whole section.",
    type: "textarea",
    page: "about",
    group: "about.band",
    gridColumn: "col-span-full",
    defaultValue:
      "Skin you feel confident in — through honest guidance, gentle expertise, and treatments that work with your skin, never against it.",
  },
];

// ─── Meet the owner ────────────────────────────────────────────────────────────

const aboutOwnerData: TemplateField[] = [
  {
    key: "vii.about.owner-overline",
    label: "Small label",
    description: "Small label above the owner heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Meet the Team",
  },
  {
    key: "vii.about.owner-heading",
    label: "Heading",
    description: "The plain part of the owner heading (e.g. 'Meet').",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Meet",
  },
  {
    key: "vii.about.owner-heading-accent",
    label: "Heading, highlighted words",
    description:
      "Shown in italics after the heading — typically the owner's name.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Simone",
  },
  {
    key: "vii.about.owner-role",
    label: "Role",
    description:
      "The owner's title or credentials (e.g. 'Founder & Lead Esthetician'). Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-1",
    defaultValue: "Founder & Lead Esthetician",
  },
  {
    key: "vii.about.owner-body",
    label: "Bio",
    description:
      "A paragraph introducing the owner — their story, expertise, and what they bring to your skin. Leave blank to hide.",
    type: "textarea",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
    defaultValue:
      "Skinbar VII began with a single belief: that everyone deserves to feel at home in their own skin. After more than a decade behind the treatment table, Simone built the studio she always wished existed — one rooted in education over upsell, calm over rush, and results that last. She leads every consultation personally, and treats each face like the one-of-a-kind canvas it is.",
  },
  {
    key: "vii.about.owner-image",
    label: "Portrait",
    description: "A portrait photo of the owner, shown in the right column.",
    type: "image",
    page: "about",
    group: "about.owner",
    gridColumn: "col-span-full",
  },
];

// ─── Meet the team ─────────────────────────────────────────────────────────────

const aboutTeamData: TemplateField[] = [
  {
    key: "vii.about.team-overline",
    label: "Small label",
    description: "Small label above the team heading. Leave blank to hide.",
    type: "text",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-1",
    defaultValue: "The Studio",
  },
  {
    key: "vii.about.team-heading",
    label: "Heading",
    description: "Heading above the team grid.",
    type: "text",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-1",
    defaultValue: "The team behind your glow",
  },
  {
    key: "vii.about.team-intro",
    label: "Intro text",
    description: "Short paragraph introducing the team grid below. Leave blank to hide.",
    type: "textarea",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-full",
    defaultValue:
      "Every member of our team is licensed, endlessly curious, and genuinely invested in your skin. Get to know the faces you'll see at your next visit.",
  },
  {
    key: "vii.about.team",
    label: "Team members",
    description:
      "Your staff, shown as a grid of cards. Shows built-in example team members when this list is empty.",
    type: "list",
    page: "about",
    group: "about.team",
    gridColumn: "col-span-full",
    itemLabel: "team member",
    defaultsWhenEmpty: true,
    maxItems: 8,
    itemSchema: [
      {
        key: "image",
        label: "Photo",
        type: "image",
        description: "Portrait photo. Shows a plain color fill when blank.",
        placeholder: "Upload a portrait photo",
        optional: true,
      },
      {
        key: "name",
        label: "Name",
        type: "text",
        description: "This team member's name.",
        placeholder: "e.g. Jane Doe",
      },
      {
        key: "role",
        label: "Role",
        type: "text",
        description: "Job title or role. Leave blank to hide.",
        placeholder: "e.g. Licensed Esthetician",
        optional: true,
      },
      {
        key: "bio",
        label: "Short bio",
        type: "textarea",
        description: "A sentence or two about this team member. Leave blank to hide.",
        placeholder: "A sentence or two about this team member",
        optional: true,
      },
    ],
  },
];

// ─── Contact ──────────────────────────────────────────────────────────────────

const aboutCtaData: TemplateField[] = [
  {
    key: "vii.about.cta-image",
    label: "Background photo",
    description: "Photo behind this closing contact section.",
    type: "image",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.cta-heading",
    label: "Heading",
    description: "Large italic heading for this closing contact section.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get in touch",
  },
  {
    key: "vii.about.cta-subheading",
    label: "Small label",
    description: "Small label below the heading.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Ready to glow?",
  },
  {
    key: "vii.about.cta-body",
    label: "Body text",
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
    label: "Button text",
    description:
      "Text for the primary button. Leave blank to hide it.",
    type: "text",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a Facial",
  },
  {
    key: "vii.about.cta-button-link",
    label: "Button link",
    description:
      "Where the button sends visitors — your services page or an external booking link.",
    type: "url",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "/services",
  },
  {
    key: "vii.about.cta-show-phone",
    label: "Show phone number",
    description:
      "Display your business phone number (from Settings) in this section. Turn off for booking-only sections.",
    type: "boolean",
    page: "about",
    group: "about.cta",
    gridColumn: "col-span-1",
    defaultValue: "true",
  },
  {
    key: "vii.about.cta-show-email",
    label: "Show email",
    description:
      "Display your business email (from Settings) in this section. Turn off for booking-only sections.",
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
    title: "Page header",
    description: "Full-width banner photo with a small label and page title",
    icon: "🌿",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission",
    description:
      "Centered two-part heading and opening paragraph introducing the business",
    icon: "✨",
    columns: 2,
  },
  {
    id: "about.steps",
    title: "Steps",
    description:
      "Heading, intro, and the alternating photo-and-text rows for your process",
    icon: "💆",
    columns: 2,
  },
  {
    id: "about.band",
    title: "Statement banner",
    description:
      "Full-width photo banner with a short, evocative statement overlaid",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.owner",
    title: "Meet the owner",
    description:
      "Two-column owner spotlight: heading, role, bio, and a portrait photo",
    icon: "👤",
    columns: 2,
  },
  {
    id: "about.team",
    title: "Meet the team",
    description: "Heading, intro, and a grid of your staff",
    icon: "🧑‍🤝‍🧑",
    columns: 2,
  },
  {
    id: "about.cta",
    title: "Contact",
    description:
      "Closing contact section with heading, body text, a booking button, phone, and email",
    icon: "📞",
    columns: 2,
  },
];
