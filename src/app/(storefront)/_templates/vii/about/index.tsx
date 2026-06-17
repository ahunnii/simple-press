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

// ─── Intro ────────────────────────────────────────────────────────────────────

const aboutIntroData: TemplateField[] = [
  {
    key: "vii.about.intro-overline",
    label: "Intro Overline",
    description: "Small uppercase label above the intro heading.",
    type: "text",
    page: "about",
    group: "about.intro",
    gridColumn: "col-span-1",
    defaultValue: "Wellness Redefined",
  },
  {
    key: "vii.about.intro-heading",
    label: "Intro Heading",
    description:
      "The plain part of the two-part intro heading (e.g. 'A new sense of').",
    type: "text",
    page: "about",
    group: "about.intro",
    gridColumn: "col-span-1",
    defaultValue: "A new sense of",
  },
  {
    key: "vii.about.intro-heading-accent",
    label: "Intro Heading Accent Word",
    description:
      "The italic copper accent word completing the intro heading (e.g. 'skin').",
    type: "text",
    page: "about",
    group: "about.intro",
    gridColumn: "col-span-1",
    defaultValue: "skin",
  },
  {
    key: "vii.about.intro-body",
    label: "Intro Body Text",
    description:
      "Opening paragraph introducing the studio, its philosophy, and what makes it different.",
    type: "textarea",
    page: "about",
    group: "about.intro",
    gridColumn: "col-span-full",
    defaultValue:
      "Tucked into the heart of Detroit, Skinbar VII is a modern facial studio built on a simple belief: great skin is the result of great care. We pair clinical expertise with a slower, more intentional approach — taking the time to understand your skin, your goals, and the rituals that keep you glowing long after you leave. Every treatment is personalized, every product purposeful, and every visit a moment to exhale.",
  },
];

// ─── Mission ──────────────────────────────────────────────────────────────────

const aboutMissionData: TemplateField[] = [
  {
    key: "vii.about.mission-image",
    label: "Mission Background Image",
    description:
      "Full-width image behind the mission statement. A calm, atmospheric photo works best.",
    type: "image",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
  },
  {
    key: "vii.about.mission-heading",
    label: "Mission Heading",
    description: "The plain part of the mission heading (e.g. 'Our').",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "Our",
  },
  {
    key: "vii.about.mission-heading-accent",
    label: "Mission Heading Accent Word",
    description:
      "The italic copper accent word completing the mission heading (e.g. 'mission').",
    type: "text",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-1",
    defaultValue: "mission",
  },
  {
    key: "vii.about.mission-body",
    label: "Mission Statement",
    description: "A short, evocative statement of what the studio stands for.",
    type: "textarea",
    page: "about",
    group: "about.mission",
    gridColumn: "col-span-full",
    defaultValue:
      "To give every client skin they feel confident in — through honest guidance, gentle expertise, and treatments that work with your skin, never against it.",
  },
];

// ─── Philosophy ───────────────────────────────────────────────────────────────

const aboutPhilosophyData: TemplateField[] = [
  {
    key: "vii.about.philosophy-overline",
    label: "Philosophy Overline",
    description: "Small uppercase label above the philosophy heading.",
    type: "text",
    page: "about",
    group: "about.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "Our Approach",
  },
  {
    key: "vii.about.philosophy-heading",
    label: "Philosophy Heading",
    description: "The plain part of the philosophy heading (e.g. 'A skin-first').",
    type: "text",
    page: "about",
    group: "about.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "A skin-first",
  },
  {
    key: "vii.about.philosophy-heading-accent",
    label: "Philosophy Heading Accent Word",
    description:
      "The italic copper accent word completing the philosophy heading (e.g. 'philosophy').",
    type: "text",
    page: "about",
    group: "about.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "philosophy",
  },
  {
    key: "vii.about.philosophy-body",
    label: "Philosophy Body Text",
    description:
      "A paragraph describing how the studio approaches skincare and the client experience.",
    type: "textarea",
    page: "about",
    group: "about.philosophy",
    gridColumn: "col-span-full",
    defaultValue:
      "Healthy skin is rarely about a single product or a quick fix — it's about consistency, education, and care tailored to you. We take the time to teach as much as we treat, so you understand what your skin needs and why. No pressure, no one-size-fits-all routines: just thoughtful, results-driven facials and a partnership that grows with your skin over time.",
  },
  {
    key: "vii.about.philosophy-image",
    label: "Philosophy Image",
    description: "Image shown alongside the philosophy text (right column).",
    type: "image",
    page: "about",
    group: "about.philosophy",
    gridColumn: "col-span-full",
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
    description: "Short paragraph introducing the six-step facial below the heading.",
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
];

// ─── Aggregated export ────────────────────────────────────────────────────────

export const viiAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutIntroData,
  ...aboutMissionData,
  ...aboutPhilosophyData,
  ...aboutStepsData,
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
    id: "about.intro",
    title: "Intro Section",
    description: "Two-part heading and opening paragraph introducing the studio",
    icon: "✨",
    columns: 2,
  },
  {
    id: "about.mission",
    title: "Mission Statement",
    description: "Dark image band with a short mission statement overlaid",
    icon: "🎯",
    columns: 2,
  },
  {
    id: "about.philosophy",
    title: "Philosophy Section",
    description: "Two-column heading, body copy, and an accompanying image",
    icon: "🧴",
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
    id: "about.cta",
    title: "Closing Contact CTA",
    description:
      "Dark contact section with heading, body text, phone, and email",
    icon: "📞",
    columns: 2,
  },
];
