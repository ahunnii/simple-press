import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";

import { DREAM_QUOTE_HREF } from "../shared/dream-quote-href";

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
    label: "Heading",
    description: "The page's H1, before the highlighted word.",
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Meet",
  },
  {
    key: "dream.about.hero-accent",
    label: "Highlighted word",
    description: 'Script-styled word after the heading (e.g. "Meet Selest").',
    type: "text",
    page: "about",
    group: "about.hero",
    gridColumn: "col-span-1",
    defaultValue: "Selest",
  },
  {
    key: "dream.about.hero-lede",
    label: "Intro",
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

/**
 * Fallback shown by `DreamAboutStory` while the `dream.about.story-body`
 * richtext field is empty (a fresh store has no saved story). `getRichTextFieldValue`
 * only reads a saved Tiptap doc from `customFields` — it does not know about
 * a field's `defaultValue` — so this HTML string IS that field's
 * `defaultValue` below, exported for the page/component to render directly
 * (as static markup, not through the Tiptap renderer) once the saved value
 * is empty. Text verbatim from the shipped copy this replaces.
 */
export const DREAM_ABOUT_STORY_BODY_DEFAULT_HTML =
  "<p>Selest is an event designer, not a planner. Give her the shape of your day and she'll build a world around it — drape by drape, chair by chair, until the space matches what you imagined.</p><p>The best part of the job, she says, is watching guests walk in and see their theme for the first time. That's the smile she's designing for.</p>";

const aboutStoryData: TemplateField[] = [
  {
    key: "dream.about.story-portrait",
    label: "Portrait photo",
    description: "Portrait of Selest, shown at a 4:5 crop.",
    type: "image",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "dream.about.story-portrait-alt",
    label: "Portrait alt text",
    description: "Alt text for the portrait photo, for screen readers.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Selest, the designer behind Dream Your Theme",
  },
  {
    key: "dream.about.story-quote-lead",
    label: "Pull-quote text",
    description:
      'Plain part of the pull-quote, before the highlighted words (e.g. "Your dreams become a theme.").',
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Your dreams become",
  },
  {
    key: "dream.about.story-quote-accent",
    label: "Pull-quote highlighted words",
    description: "Script-styled words that follow the pull-quote text.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "a theme.",
  },
  {
    key: "dream.about.story-body",
    label: "Story (rich text)",
    description:
      "The story itself — as many paragraphs as you like. Bold, links and lists all render.",
    type: "richtext",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: DREAM_ABOUT_STORY_BODY_DEFAULT_HTML,
  },
  {
    key: "dream.about.story-portrait-empty",
    label: "Portrait empty message",
    description:
      "Message shown in place of the portrait photo when none is set.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-full",
    defaultValue: "Selest's portrait is on its way",
  },
  {
    key: "dream.about.story-cta-label",
    label: "Button label",
    description: "Label for the button under the story.",
    type: "text",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: "Contact Selest about your next event",
  },
  {
    key: "dream.about.story-cta-url",
    label: "Button link",
    description: "Where the button under the story links to.",
    type: "url",
    page: "about",
    group: "about.story",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
  },
];

// ─── Consultation — heading + lede + step list — hideable ────────────────────

/**
 * Built-in consultation steps (`dream.about.consultation-steps`'s
 * `defaultRows`) — the retired numbered `consultation-step-{1..3}-*` fields'
 * old defaults, verbatim. Also the resolver's fallback.
 */
export const DREAM_CONSULTATION_STEPS_DEFAULT_ROWS: Record<string, string>[] = [
  {
    heading: "See the venue",
    body: "Selest walks the space with you and starts sketching the shape of the day.",
  },
  {
    heading: "Design the plan",
    body: "Colors, draping, and rental pieces come together into one themed plan.",
  },
  {
    heading: "Prepare the day",
    body: "Everything is delivered, set, and styled before your first guest arrives.",
  },
];

const aboutConsultationData: TemplateField[] = [
  {
    key: "dream.about.consultation-heading",
    label: "Heading",
    description: "Heading above the consultation steps.",
    type: "text",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue: "How the consultation works.",
  },
  {
    key: "dream.about.consultation-lede",
    label: "Intro",
    description: "Short line under the consultation heading.",
    type: "textarea",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    defaultValue:
      "A short conversation is all it takes to turn your occasion into a plan.",
  },
  {
    key: "dream.about.consultation-steps",
    label: "Steps",
    description:
      "The numbered steps beside the heading, in order. Add, remove, or drag to reorder.",
    type: "list",
    page: "about",
    group: "about.consultation",
    gridColumn: "col-span-full",
    minItems: 1,
    maxItems: 6,
    defaultsWhenEmpty: true,
    itemLabel: "step",
    summaryKey: "heading",
    itemSchema: [
      {
        key: "heading",
        label: "Heading",
        type: "text",
        description: "Short heading for this step.",
        placeholder: "e.g. See the venue",
      },
      {
        key: "body",
        label: "Description",
        type: "textarea",
        description: "A line or two describing this step.",
      },
    ],
    defaultRows: DREAM_CONSULTATION_STEPS_DEFAULT_ROWS,
  },
];

// ─── Quote band — hideable ──────────────────────────────────────────────────

const aboutQuoteData: TemplateField[] = [
  {
    key: "dream.about.quote-heading",
    label: "Heading",
    description:
      "Plain part of this section's heading, before the highlighted words.",
    type: "text",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "Ready to plan your",
  },
  {
    key: "dream.about.quote-accent",
    label: "Highlighted words",
    description:
      'Script-styled words that follow the heading (e.g. "Estimate Quote").',
    type: "text",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "Estimate Quote",
  },
  {
    key: "dream.about.quote-lede",
    label: "Intro",
    description: "Short line under this section's heading.",
    type: "textarea",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-full",
    defaultValue:
      "Tell Selest about your event and she'll help you shape the look.",
  },
  {
    key: "dream.about.quote-cta-label",
    label: "Button label",
    description: "Label for this section's button.",
    type: "text",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: "Request an Estimate Quote",
  },
  {
    key: "dream.about.quote-cta-url",
    label: "Button link",
    description: "Where this section's button links to.",
    type: "url",
    page: "about",
    group: "about.quote",
    gridColumn: "col-span-1",
    defaultValue: DREAM_QUOTE_HREF,
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
    title: "Page header",
    description: "Heading, highlighted word, and intro",
    icon: "☁️",
    columns: 2,
  },
  {
    id: "about.story",
    title: "Story",
    description: "Portrait, pull-quote, story, and a closing button",
    icon: "🌸",
    columns: 2,
  },
  {
    id: "about.consultation",
    title: "How the consultation works",
    description: "Heading, intro, and the numbered consultation steps",
    icon: "📋",
    columns: 2,
  },
  {
    id: "about.quote",
    title: "Quote request",
    description: "Closing section with a heading and a button",
    icon: "✉️",
    columns: 2,
  },
];

export const dreamAboutSections: TemplateSection[] = [
  {
    id: "about.hero",
    page: "about",
    title: "Page header",
    description: "Logo, heading, and intro",
    groupIds: ["about.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "about.story",
    page: "about",
    title: "Story",
    description: "Portrait, pull-quote, story, and button",
    groupIds: ["about.story"],
    order: 1,
    hideable: false,
  },
  {
    id: "about.consultation",
    page: "about",
    title: "How the consultation works",
    description: "Heading, intro, and numbered steps",
    groupIds: ["about.consultation"],
    order: 2,
    hideable: true,
  },
  {
    id: "about.quote",
    page: "about",
    title: "Quote request",
    description: "Closing section with a heading and a button",
    groupIds: ["about.quote"],
    order: 3,
    hideable: true,
  },
];
