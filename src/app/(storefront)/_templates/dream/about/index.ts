import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

/**
 * About ("Meet Selest") — design.md "Per-page section concepts › About".
 * Four sections: hero (not hideable), story (not hideable — this is the
 * page's load-bearing content), consultation (hideable), quote band
 * (hideable). Real copy from the kit voice (Copy voice: warm, dreamy,
 * short, second person; "Selest" by name).
 */

// ─── Hero — NOT hideable ────────────────────────────────────────────────────

const aboutHeroData: TemplateField[] = [
  {
    key: "dream.about.hero-heading",
    label: "Page Heading",
    description: "The page's H1, before the script accent word.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Meet",
  },
  {
    key: "dream.about.hero-accent",
    label: "Page Heading Accent Word",
    description:
      'Script word rendered in rose after the heading (design.md: h1 "Meet Selest").',
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Selest",
  },
  {
    key: "dream.about.hero-lede",
    label: "Page Lede",
    description: "Short line under the page heading.",
    type: "textarea",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-full",
    defaultValue:
      "The designer behind Dream Your Theme — turning your occasion into a fully realized scene, one detail at a time.",
  },
];

// ─── Story — portrait + pull-quote + rich-text story + CTA — NOT hideable ──

const aboutStoryData: TemplateField[] = [
  {
    key: "dream.about.story-portrait",
    label: "Portrait Photo",
    description: "Portrait of Selest, shown at a 4:5 crop.",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dream.about.story-portrait-alt",
    label: "Portrait Alt Text",
    description: "Alt text for the portrait photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Selest, the designer behind Dream Your Theme",
  },
  {
    key: "dream.about.story-quote-lead",
    label: "Pull-quote — Lead Text",
    description:
      'Plain part of the pull-quote heading, before the script accent (must-keep copy: "Your dreams become a theme.").',
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Your dreams become",
  },
  {
    key: "dream.about.story-quote-accent",
    label: "Pull-quote — Script Accent",
    description: "Script word(s) rendered in rose after the lead text.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "a theme.",
  },
  {
    key: "dream.about.story-body",
    label: "Selest's Story (rich text)",
    description:
      "The story itself — as many paragraphs as you like. Bold, links and lists all render.",
    type: "richtext",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "dream.about.story-cta-label",
    label: "Story CTA Label",
    description: "Label for the button under the story.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "Contact Selest about your next event",
  },
  {
    key: "dream.about.story-cta-url",
    label: "Story CTA Link",
    description: "Where the story button links to.",
    type: "url",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Consultation — heading + lede + 3 steps — hideable ────────────────────

const aboutConsultationData: TemplateField[] = [
  {
    key: "dream.about.consultation-heading",
    label: "Consultation Heading",
    description: "Heading above the consultation steps.",
    type: "text",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue: "How the consultation works.",
  },
  {
    key: "dream.about.consultation-lede",
    label: "Consultation Lede",
    description: "Short line under the consultation heading.",
    type: "textarea",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue:
      "A short conversation is all it takes to turn your occasion into a plan.",
  },
  {
    key: "dream.about.consultation-step-1-heading",
    label: "Step 1 Heading",
    description: "First consultation step's heading.",
    type: "text",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-1",
    defaultValue: "See the venue",
  },
  {
    key: "dream.about.consultation-step-1-body",
    label: "Step 1 Body",
    description: "First consultation step's body.",
    type: "textarea",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue:
      "Selest walks the space with you and starts sketching the shape of the day.",
  },
  {
    key: "dream.about.consultation-step-2-heading",
    label: "Step 2 Heading",
    description: "Second consultation step's heading.",
    type: "text",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-1",
    defaultValue: "Design the plan",
  },
  {
    key: "dream.about.consultation-step-2-body",
    label: "Step 2 Body",
    description: "Second consultation step's body.",
    type: "textarea",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue:
      "Colors, draping, and rental pieces come together into one themed plan.",
  },
  {
    key: "dream.about.consultation-step-3-heading",
    label: "Step 3 Heading",
    description: "Third consultation step's heading.",
    type: "text",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-1",
    defaultValue: "Prepare the day",
  },
  {
    key: "dream.about.consultation-step-3-body",
    label: "Step 3 Body",
    description: "Third consultation step's body.",
    type: "textarea",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue:
      "Everything is delivered, set, and styled before your first guest arrives.",
  },
];

// ─── Quote band — hideable ──────────────────────────────────────────────────

const aboutQuoteData: TemplateField[] = [
  {
    key: "dream.about.quote-heading",
    label: "Quote Band Heading",
    description: "Plain part of the closing quote-band heading.",
    type: "text",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "Ready to plan your",
  },
  {
    key: "dream.about.quote-accent",
    label: "Quote Band Heading Accent",
    description: "Script accent phrase rendered in rose after the heading.",
    type: "text",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.about.quote-lede",
    label: "Quote Band Lede",
    description: "Short line under the quote-band heading.",
    type: "textarea",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest about your event and she'll help you shape the look.",
  },
  {
    key: "dream.about.quote-cta-label",
    label: "Quote Band Button Label",
    description: "Label for the quote-band button.",
    type: "text",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.about.quote-cta-url",
    label: "Quote Band Button Link",
    description: "Where the quote-band button links to.",
    type: "url",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
  },
];

// ─── Aggregated export ──────────────────────────────────────────────────────

export const dreamAboutData: TemplateField[] = [
  ...aboutHeroData,
  ...aboutStoryData,
  ...aboutConsultationData,
  ...aboutQuoteData,
];

export const dreamAboutFieldGroups: TemplateFieldGroup[] = [
  {
    id: "about.hero",
    title: "Page Hero",
    description: "Heading, script accent, and lede",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Selest's Story",
    description: "Portrait, pull-quote, story, and a closing CTA",
    icon: "🌸",
    columns: 2,
  },
  {
    id: "about.consultation",
    title: "How the Consultation Works",
    description: "Heading, lede, and the three consultation steps",
    icon: "📋",
    columns: 2,
  },
  {
    id: "about.quote",
    title: "Estimate Quote Band",
    description: "Closing call-to-action band",
    icon: "✉️",
    columns: 2,
  },
];

export const dreamAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Page Hero",
    description: "Logo, heading, and lede",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.story",
    page: "about",
    title: "Selest's Story",
    description: "Portrait, pull-quote, story, and CTA",
    groupIds: ["about.story"],
    order: 1,
    hideable: false,
  },
  {
    id: "about.consultation",
    page: "about",
    title: "How the Consultation Works",
    description: "Heading, lede, and three-step process",
    groupIds: ["about.consultation"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.quote",
    page: "about",
    title: "Estimate Quote Band",
    description: "Closing call-to-action band",
    groupIds: ["about.quote"],
    order: 3,
    hideable: true,
  },
];
