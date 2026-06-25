/**
 * Vii-specific service-page template field definitions.
 *
 * Three templates:
 *   vii-sanctuary — Immersive editorial hero + treatment card grid
 *   vii-ritual    — Intimate step-by-step ritual layout (alternating media/text rows)
 *   vii-atelier   — Gallery-forward mosaic + refined table-style treatment list
 *
 * Field key convention: "<def-id>.<field-slug>"
 */
import type { ServiceTemplateDef } from "~/lib/service-templates";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

// ─── vii-sanctuary ────────────────────────────────────────────────────────────

export const viiSanctuaryFields: TemplateField[] = [
  // Hero
  {
    key: "vii-sanctuary.hero-video",
    label: "Hero Video",
    description:
      "Optional background video (MP4) for the full-viewport hero. Takes precedence over the hero image when set.",
    type: "video",
    page: "homepage",
    group: "vii-sanctuary.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-sanctuary.hero-image",
    label: "Hero Image",
    description: "Full-viewport hero image. Used when no video is configured.",
    type: "image",
    page: "homepage",
    group: "vii-sanctuary.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-sanctuary.hero-overline",
    label: "Hero Overline",
    description:
      "Short all-caps eyebrow text above the service name in the hero (e.g. 'Skinbar VII · Services').",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Services",
    placeholder: "e.g. Skinbar VII · Facials",
  },

  // Intro
  {
    key: "vii-sanctuary.intro-overline",
    label: "Intro Overline",
    description: "Small all-caps label above the intro heading.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.intro",
    gridColumn: "col-span-1",
    defaultValue: "The Experience",
    placeholder: "e.g. The Experience",
  },
  {
    key: "vii-sanctuary.intro-heading",
    label: "Intro Heading",
    description: "Primary serif heading in the intro block.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.intro",
    gridColumn: "col-span-1",
    defaultValue: "A sanctuary for",
    placeholder: "e.g. Skin care designed for",
  },
  {
    key: "vii-sanctuary.intro-heading-accent",
    label: "Intro Heading Accent",
    description:
      "Italic copper-coloured word or phrase appended to the heading.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.intro",
    gridColumn: "col-span-1",
    defaultValue: "the senses.",
    placeholder: "e.g. your skin.",
  },
  {
    key: "vii-sanctuary.intro-body",
    label: "Intro Body",
    description: "Rich-text description of what this service category offers.",
    type: "richtext",
    page: "homepage",
    group: "vii-sanctuary.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe the experience guests can expect…",
  },
  {
    key: "vii-sanctuary.intro-image",
    label: "Intro Image",
    description:
      "Optional image shown beneath the intro body text. Displayed centered with a max-width of 680px.",
    type: "image",
    page: "homepage",
    group: "vii-sanctuary.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii-sanctuary.intro-video",
    label: "Intro Video",
    description:
      "Optional video (MP4) shown beneath the intro body text. Takes precedence over the intro image when set.",
    type: "video",
    page: "homepage",
    group: "vii-sanctuary.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Benefits strip
  {
    key: "vii-sanctuary.benefits",
    label: "Benefits Strip",
    description:
      "Short highlight labels shown in a copper-dotted strip across the dark navy band (e.g. 'Personalized', 'Results-Driven'). Up to 6 items.",
    type: "list",
    page: "homepage",
    group: "vii-sanctuary.benefits",
    gridColumn: "col-span-full",
    maxItems: 6,
    itemSchema: [
      {
        key: "label",
        label: "Highlight",
        type: "text",
        placeholder: "e.g. Personalized Treatment",
      },
    ],
    defaultValue: "",
  },

  // Treatment menu heading
  {
    key: "vii-sanctuary.menu-heading",
    label: "Treatment Menu Heading",
    description:
      "Heading above the treatment card grid. Leave blank for the default 'The treatment menu' heading.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.menu",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Signature Facials",
  },

  // Closing CTA
  {
    key: "vii-sanctuary.cta-image",
    label: "Closing CTA Image",
    description:
      "Background image for the closing contact CTA section (shown at 30% opacity behind the navy overlay).",
    type: "image",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-sanctuary.cta-heading",
    label: "Closing CTA Heading",
    description: "Large italic serif heading in the closing CTA block.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "Begin your ritual.",
    placeholder: "e.g. Begin your ritual.",
  },
  {
    key: "vii-sanctuary.cta-subheading",
    label: "Closing CTA Subheading",
    description: "Small all-caps line below the heading.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. Detroit · By Appointment",
  },
  {
    key: "vii-sanctuary.cta-body",
    label: "Closing CTA Body",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Our specialists are ready to create a personalized experience for you. Reach out to reserve your session.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii-sanctuary.cta-button-label",
    label: "Closing CTA Button Label",
    description:
      "Label for the primary action button in the closing CTA. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii-sanctuary.cta-button-url",
    label: "Closing CTA Button URL",
    description:
      "URL the CTA button links to (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii-sanctuary.cta-embed",
    label: "Closing CTA Embed",
    description:
      "Optional embed (e.g. a booking widget) shown in the closing CTA section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-sanctuary.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const viiSanctuaryFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-sanctuary.hero",
    title: "Hero",
    description:
      "Full-viewport hero video or image, and the overline text displayed above the service name",
    icon: "🎬",
    columns: 1,
  },
  {
    id: "vii-sanctuary.intro",
    title: "Introduction",
    description:
      "Overline, split heading, rich-text body, and an optional image or video below the body",
    icon: "✍️",
    columns: 2,
  },
  {
    id: "vii-sanctuary.benefits",
    title: "Benefits Strip",
    description:
      "Short highlight labels shown in a navy band between the intro and the treatment grid",
    icon: "✨",
    columns: 1,
  },
  {
    id: "vii-sanctuary.menu",
    title: "Treatment Menu",
    description: "Optional custom heading for the treatment card grid section",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "vii-sanctuary.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, button, embed, and contact details for the closing navy CTA section",
    icon: "📞",
    columns: 2,
  },
];

// ─── vii-ritual ───────────────────────────────────────────────────────────────

export const viiRitualFields: TemplateField[] = [
  // Hero
  {
    key: "vii-ritual.hero-video",
    label: "Hero Video",
    description:
      "Optional background video (MP4) for the centred hero. Takes precedence over the hero image when set.",
    type: "video",
    page: "homepage",
    group: "vii-ritual.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-ritual.hero-image",
    label: "Hero Image",
    description:
      "Background image for the centred hero. Shown at reduced opacity behind a navy overlay.",
    type: "image",
    page: "homepage",
    group: "vii-ritual.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-ritual.hero-overline",
    label: "Hero Overline",
    description:
      "Small all-caps eyebrow text above the service name (e.g. 'Skinbar VII · Rituals').",
    type: "text",
    page: "homepage",
    group: "vii-ritual.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Rituals",
    placeholder: "e.g. Skinbar VII · Body Treatments",
  },

  // Philosophy
  {
    key: "vii-ritual.philosophy-overline",
    label: "Philosophy Overline",
    description: "Small all-caps label above the philosophy heading.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "Our Philosophy",
    placeholder: "e.g. Our Approach",
  },
  {
    key: "vii-ritual.philosophy-heading",
    label: "Philosophy Heading",
    description: "Main serif heading in the philosophy block.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "Crafted for",
    placeholder: "e.g. Tailored for",
  },
  {
    key: "vii-ritual.philosophy-heading-accent",
    label: "Philosophy Heading Accent",
    description:
      "Italic copper-coloured word appended to the philosophy heading.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "you.",
    placeholder: "e.g. your skin.",
  },
  {
    key: "vii-ritual.philosophy-body",
    label: "Philosophy Body",
    description:
      "Rich-text paragraph describing the approach behind this service category.",
    type: "richtext",
    page: "homepage",
    group: "vii-ritual.philosophy",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe the ritual philosophy…",
  },
  {
    key: "vii-ritual.philosophy-image",
    label: "Philosophy Image",
    description:
      "Optional image shown beneath the philosophy body text. Displayed centered with a max-width matching the section (~680px).",
    type: "image",
    page: "homepage",
    group: "vii-ritual.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii-ritual.philosophy-video",
    label: "Philosophy Video",
    description:
      "Optional video (MP4) shown beneath the philosophy body text. Takes precedence over the philosophy image when set.",
    type: "video",
    page: "homepage",
    group: "vii-ritual.philosophy",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Closing CTA
  {
    key: "vii-ritual.cta-image",
    label: "Closing CTA Image",
    description: "Background image for the closing contact CTA.",
    type: "image",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-ritual.cta-heading",
    label: "Closing CTA Heading",
    description: "Large italic serif heading in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "Reserve your ritual.",
    placeholder: "e.g. Reserve your ritual.",
  },
  {
    key: "vii-ritual.cta-subheading",
    label: "Closing CTA Subheading",
    description: "Small all-caps line below the CTA heading.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. Detroit · By Appointment",
  },
  {
    key: "vii-ritual.cta-body",
    label: "Closing CTA Body",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Each ritual is tailored to your skin, your pace, your moment. Contact us to begin.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii-ritual.cta-button-label",
    label: "Closing CTA Button Label",
    description:
      "Label for the primary action button in the closing CTA. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii-ritual.cta-button-url",
    label: "Closing CTA Button URL",
    description:
      "URL the CTA button links to (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii-ritual.cta-embed",
    label: "Closing CTA Embed",
    description:
      "Optional embed (e.g. a booking widget) shown in the closing CTA section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-ritual.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const viiRitualFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-ritual.hero",
    title: "Hero",
    description:
      "Background video or image and overline text for the centred dark hero section",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "vii-ritual.philosophy",
    title: "Philosophy",
    description:
      "Overline, split heading, rich-text body, and an optional image or video for the philosophy block shown between the hero and treatment steps",
    icon: "💭",
    columns: 2,
  },
  {
    id: "vii-ritual.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, button, embed, and contact details for the closing navy CTA",
    icon: "📞",
    columns: 2,
  },
];

// ─── vii-atelier ──────────────────────────────────────────────────────────────

export const viiAtelierFields: TemplateField[] = [
  // Hero gallery + overline
  {
    key: "vii-atelier.hero-video",
    label: "Hero Video",
    description:
      "Optional background video (MP4) shown as a large full-width panel above the mosaic gallery when set. Takes precedence over the gallery as the primary hero.",
    type: "video",
    page: "homepage",
    group: "vii-atelier.gallery",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-atelier.hero-overline",
    label: "Hero Overline",
    description:
      "Small all-caps eyebrow text above the service name in the mosaic hero.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.gallery",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Atelier",
    placeholder: "e.g. Skinbar VII · Skincare",
  },
  {
    key: "vii-atelier.gallery",
    label: "Gallery Images",
    description:
      "Up to 5 images for the mosaic hero grid. The first image occupies the large left panel; the remaining four fill the right 2×2 grid.",
    type: "list",
    page: "homepage",
    group: "vii-atelier.gallery",
    gridColumn: "col-span-full",
    maxItems: 5,
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        placeholder: "Upload image",
      },
    ],
    defaultValue: "",
  },

  // Pull quote
  {
    key: "vii-atelier.pull-quote",
    label: "Pull Quote",
    description:
      "A short brand statement or client quote displayed in large italic serif on the dark navy band.",
    type: "textarea",
    page: "homepage",
    group: "vii-atelier.quote",
    gridColumn: "col-span-full",
    defaultValue: "Every skin has a story. We listen before we touch.",
    placeholder: "A brand statement or meaningful quote…",
  },
  {
    key: "vii-atelier.pull-quote-attribution",
    label: "Pull Quote Attribution",
    description:
      "Optional attribution line below the quote (e.g. 'Skinbar VII, Detroit').",
    type: "text",
    page: "homepage",
    group: "vii-atelier.quote",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII, Detroit",
    placeholder: "e.g. Skinbar VII, Detroit",
  },
  {
    key: "vii-atelier.quote-image",
    label: "Quote Section Image",
    description:
      "Optional image shown beneath the pull quote in the navy band. Displayed centered with vii styling.",
    type: "image",
    page: "homepage",
    group: "vii-atelier.quote",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii-atelier.quote-video",
    label: "Quote Section Video",
    description:
      "Optional video (MP4) shown beneath the pull quote. Takes precedence over the quote image when set.",
    type: "video",
    page: "homepage",
    group: "vii-atelier.quote",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Treatment list heading
  {
    key: "vii-atelier.list-heading",
    label: "Treatment List Heading",
    description:
      "Heading for the refined treatment list section. Leave blank for the default 'Our treatments' heading.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.list",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. The Collection",
  },
  {
    key: "vii-atelier.list-intro",
    label: "Treatment List Intro",
    description:
      "Short paragraph shown to the right of the list heading, describing the service collection.",
    type: "textarea",
    page: "homepage",
    group: "vii-atelier.list",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Briefly describe the treatment collection…",
  },

  // Closing CTA
  {
    key: "vii-atelier.cta-image",
    label: "Closing CTA Image",
    description: "Background image for the closing contact CTA.",
    type: "image",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-atelier.cta-heading",
    label: "Closing CTA Heading",
    description: "Large italic serif heading in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "Schedule your visit.",
    placeholder: "e.g. Schedule your visit.",
  },
  {
    key: "vii-atelier.cta-subheading",
    label: "Closing CTA Subheading",
    description: "Small all-caps line below the CTA heading.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. Detroit · By Appointment",
  },
  {
    key: "vii-atelier.cta-body",
    label: "Closing CTA Body",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Our atelier is open by appointment. We look forward to creating your experience.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii-atelier.cta-button-label",
    label: "Closing CTA Button Label",
    description:
      "Label for the primary action button in the closing CTA. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii-atelier.cta-button-url",
    label: "Closing CTA Button URL",
    description:
      "URL the CTA button links to (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii-atelier.cta-embed",
    label: "Closing CTA Embed",
    description:
      "Optional embed (e.g. a booking widget) shown in the closing CTA section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-atelier.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const viiAtelierFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-atelier.gallery",
    title: "Mosaic Gallery",
    description:
      "Optional hero video (takes precedence), overline text, and up to 5 images that compose the mosaic hero grid",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "vii-atelier.quote",
    title: "Pull Quote",
    description:
      "Brand statement or client quote on the dark navy band, with optional image or video beneath",
    icon: "💬",
    columns: 1,
  },
  {
    id: "vii-atelier.list",
    title: "Treatment List",
    description:
      "Optional heading and intro paragraph for the refined two-column treatment table",
    icon: "📋",
    columns: 1,
  },
  {
    id: "vii-atelier.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, button, embed, and contact details for the closing navy CTA",
    icon: "📞",
    columns: 2,
  },
];

// ─── vii-ledger ───────────────────────────────────────────────────────────────

export const viiLedgerFields: TemplateField[] = [
  // Hero
  {
    key: "vii-ledger.hero-video",
    label: "Hero Video",
    description:
      "Optional hero video (MP4) shown as a single full-width media panel. Takes precedence over the hero image. Leave both blank for the minimal cream typographic hero.",
    type: "video",
    page: "homepage",
    group: "vii-ledger.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-ledger.hero-image",
    label: "Hero Image",
    description:
      "Optional full-bleed hero image, used when no video is set.",
    type: "image",
    page: "homepage",
    group: "vii-ledger.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-ledger.hero-overline",
    label: "Hero Overline",
    description:
      "Small all-caps eyebrow text above the service name (e.g. 'Skinbar VII · Services').",
    type: "text",
    page: "homepage",
    group: "vii-ledger.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Services",
    placeholder: "e.g. Skinbar VII · Facials",
  },

  // Intro
  {
    key: "vii-ledger.intro-overline",
    label: "Intro Overline",
    description: "Small all-caps label above the intro heading.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. The Experience",
  },
  {
    key: "vii-ledger.intro-heading",
    label: "Intro Heading",
    description: "Primary serif heading in the intro block.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Designed for your skin.",
  },
  {
    key: "vii-ledger.intro-heading-accent",
    label: "Intro Heading Accent",
    description:
      "Italic copper-coloured word or phrase appended to the heading.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. your skin.",
  },
  {
    key: "vii-ledger.intro-body",
    label: "Intro Body",
    description: "Rich-text description of what this service category offers.",
    type: "richtext",
    page: "homepage",
    group: "vii-ledger.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe the experience guests can expect…",
  },
  {
    key: "vii-ledger.intro-image",
    label: "Intro Image",
    description:
      "Optional image shown beneath the intro body text. Displayed centered with a max-width of 680px.",
    type: "image",
    page: "homepage",
    group: "vii-ledger.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii-ledger.intro-video",
    label: "Intro Video",
    description:
      "Optional video (MP4) shown beneath the intro body text. Takes precedence over the intro image when set.",
    type: "video",
    page: "homepage",
    group: "vii-ledger.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Treatment list
  {
    key: "vii-ledger.list-heading",
    label: "Treatment List Heading",
    description:
      "Heading for the refined treatment list section. Leave blank for the default 'Our treatments' heading.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.list",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. The Collection",
  },
  {
    key: "vii-ledger.list-intro",
    label: "Treatment List Intro",
    description:
      "Short paragraph shown to the right of the list heading, describing the service collection.",
    type: "textarea",
    page: "homepage",
    group: "vii-ledger.list",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Briefly describe the treatment collection…",
  },

  // Notes (gratuity / cancellation)
  {
    key: "vii-ledger.notes-heading",
    label: "Notes Heading",
    description: "Optional heading for the fine-print band. Clear to hide it.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.notes",
    gridColumn: "col-span-full",
    defaultValue: "Before you book",
    placeholder: "e.g. Before you book",
  },
  {
    key: "vii-ledger.notes-gratuity",
    label: "Gratuity Note",
    description:
      "Short note about gratuity policy. Clear to hide this item.",
    type: "textarea",
    page: "homepage",
    group: "vii-ledger.notes",
    gridColumn: "col-span-1",
    defaultValue: "A 15% gratuity is added to all services.",
    placeholder: "e.g. A 15% gratuity is added to all services.",
  },
  {
    key: "vii-ledger.notes-cancellation",
    label: "Cancellation Policy",
    description:
      "Short note about cancellation or rescheduling. Clear to hide this item.",
    type: "textarea",
    page: "homepage",
    group: "vii-ledger.notes",
    gridColumn: "col-span-1",
    defaultValue:
      "Please allow at least 48 hours' notice to cancel or reschedule an appointment.",
    placeholder: "e.g. Please allow at least 48 hours' notice…",
  },

  // Product Rail
  {
    key: "vii-ledger.rail-overline",
    label: "Product Rail Overline",
    description: "Small caps label above the product rail heading.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.rail",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Our favorites",
  },
  {
    key: "vii-ledger.rail-heading",
    label: "Product Rail Heading",
    description: "Section heading for the featured product rail.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.rail",
    gridColumn: "col-span-1",
    defaultValue: "Take it home",
    placeholder: "e.g. Take it home",
  },
  {
    key: "vii-ledger.rail-collection",
    label: "Product Rail Collection",
    description:
      "Pick a collection to feature. Defaults to your latest products when left empty.",
    type: "collection",
    page: "homepage",
    group: "vii-ledger.rail",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-ledger.rail-featured-only",
    label: "Show featured products only",
    description:
      "When no collection is selected: on shows only products you've marked Featured; off shows your most recent products.",
    type: "boolean",
    page: "homepage",
    group: "vii-ledger.rail",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
  {
    key: "vii-ledger.rail-cta-text",
    label: "Product Rail CTA Text",
    description: "Text for the 'shop all' link below the product rail.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.rail",
    gridColumn: "col-span-1",
    defaultValue: "Shop all products",
    placeholder: "e.g. Shop all products",
  },
  {
    key: "vii-ledger.rail-cta-url",
    label: "Product Rail CTA URL",
    description: "URL the product rail CTA link points to.",
    type: "url",
    page: "homepage",
    group: "vii-ledger.rail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },

  // Closing CTA
  {
    key: "vii-ledger.cta-image",
    label: "Closing CTA Image",
    description:
      "Background image for the closing contact CTA section (shown at 30% opacity behind the navy overlay).",
    type: "image",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-ledger.cta-heading",
    label: "Closing CTA Heading",
    description: "Large italic serif heading in the closing CTA block.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-1",
    defaultValue: "Reserve your appointment.",
    placeholder: "e.g. Reserve your appointment.",
  },
  {
    key: "vii-ledger.cta-subheading",
    label: "Closing CTA Subheading",
    description: "Small all-caps line below the heading.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. Detroit · By Appointment",
  },
  {
    key: "vii-ledger.cta-body",
    label: "Closing CTA Body",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Our specialists are ready to help you book. Reach out to reserve your session.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii-ledger.cta-button-label",
    label: "Closing CTA Button Label",
    description:
      "Label for the primary action button in the closing CTA. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii-ledger.cta-button-url",
    label: "Closing CTA Button URL",
    description:
      "URL the CTA button links to (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii-ledger.cta-embed",
    label: "Closing CTA Embed",
    description:
      "Optional embed (e.g. a booking widget) shown in the closing CTA section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-ledger.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "vii-ledger.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const viiLedgerFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-ledger.hero",
    title: "Hero",
    description:
      "Optional single image or video (video takes precedence) and overline. Leave media blank for the minimal cream typographic hero.",
    icon: "🎬",
    columns: 1,
  },
  {
    id: "vii-ledger.intro",
    title: "Introduction",
    description:
      "Optional overline, split heading, rich-text body, and an image or video below. Hidden entirely when left blank.",
    icon: "✍️",
    columns: 2,
  },
  {
    id: "vii-ledger.list",
    title: "Treatment List",
    description:
      "Optional heading and intro paragraph for the two-column treatment table.",
    icon: "📋",
    columns: 1,
  },
  {
    id: "vii-ledger.notes",
    title: "Before You Book",
    description:
      "A short fine-print band shown under the treatment prices — gratuity and cancellation policy. Clear a line to hide it.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "vii-ledger.rail",
    title: "Product Rail",
    description:
      "A row of products shown below the note. Defaults to your latest products; pick a collection to feature specific ones.",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "vii-ledger.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, button, embed, and contact details for the closing navy CTA section",
    icon: "📞",
    columns: 2,
  },
];

// ─── vii-collection ───────────────────────────────────────────────────────────

export const viiCollectionFields: TemplateField[] = [
  // Hero
  {
    key: "vii-collection.hero-video",
    label: "Hero Video",
    description:
      "Optional hero video (MP4) shown as a single full-width media panel. Takes precedence over the hero image. Leave both blank for the minimal cream typographic hero.",
    type: "video",
    page: "homepage",
    group: "vii-collection.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-collection.hero-image",
    label: "Hero Image",
    description:
      "Optional full-bleed hero image, used when no video is set.",
    type: "image",
    page: "homepage",
    group: "vii-collection.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-collection.hero-overline",
    label: "Hero Overline",
    description:
      "Small all-caps eyebrow text above the service name (e.g. 'Skinbar VII · Services').",
    type: "text",
    page: "homepage",
    group: "vii-collection.hero",
    gridColumn: "col-span-1",
    defaultValue: "Skinbar VII · Services",
    placeholder: "e.g. Skinbar VII · Skin Care",
  },

  // Intro
  {
    key: "vii-collection.intro-overline",
    label: "Intro Overline",
    description: "Small all-caps label above the intro heading.",
    type: "text",
    page: "homepage",
    group: "vii-collection.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. The Experience",
  },
  {
    key: "vii-collection.intro-heading",
    label: "Intro Heading",
    description: "Primary serif heading in the intro block.",
    type: "text",
    page: "homepage",
    group: "vii-collection.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Designed for your skin.",
  },
  {
    key: "vii-collection.intro-heading-accent",
    label: "Intro Heading Accent",
    description:
      "Italic copper-coloured word or phrase appended to the heading.",
    type: "text",
    page: "homepage",
    group: "vii-collection.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. your skin.",
  },
  {
    key: "vii-collection.intro-body",
    label: "Intro Body",
    description: "Rich-text description of what this service category offers.",
    type: "richtext",
    page: "homepage",
    group: "vii-collection.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe the experience guests can expect…",
  },
  {
    key: "vii-collection.intro-image",
    label: "Intro Image",
    description:
      "Optional image shown beneath the intro body text. Displayed centered with a max-width of 680px.",
    type: "image",
    page: "homepage",
    group: "vii-collection.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
  },
  {
    key: "vii-collection.intro-video",
    label: "Intro Video",
    description:
      "Optional video (MP4) shown beneath the intro body text. Takes precedence over the intro image when set.",
    type: "video",
    page: "homepage",
    group: "vii-collection.intro",
    gridColumn: "col-span-1",
    defaultValue: "",
  },

  // Sections list
  {
    key: "vii-collection.sections",
    label: "Service Sections",
    description:
      "Group your services into sections (e.g. Facials, Needling). Each section can have an optional description and an image or video. Assign items to sections in the \"Specific services\" tab.",
    type: "list",
    page: "homepage",
    group: "vii-collection.sections",
    gridColumn: "col-span-full",
    maxItems: 4,
    itemSchema: [
      { key: "label", label: "Section name", type: "text", placeholder: "e.g. Facials" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Optional intro for this section…" },
      { key: "image", label: "Image", type: "image" },
      { key: "video", label: "Video", type: "video" },
      { key: "premium", label: "Feature as signature collection", type: "boolean" },
    ],
    defaultValue: "",
  },

  // Treatment list
  {
    key: "vii-collection.list-heading",
    label: "Treatment List Heading",
    description:
      "Heading for the treatment list section. Leave blank for the default 'Our treatments' heading.",
    type: "text",
    page: "homepage",
    group: "vii-collection.list",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. The Collection",
  },
  {
    key: "vii-collection.list-intro",
    label: "Treatment List Intro",
    description:
      "Short paragraph shown to the right of the list heading, describing the service collection.",
    type: "textarea",
    page: "homepage",
    group: "vii-collection.list",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Briefly describe the treatment collection…",
  },

  // Notes (gratuity / cancellation)
  {
    key: "vii-collection.notes-heading",
    label: "Notes Heading",
    description: "Optional heading for the fine-print band. Clear to hide it.",
    type: "text",
    page: "homepage",
    group: "vii-collection.notes",
    gridColumn: "col-span-full",
    defaultValue: "Before you book",
    placeholder: "e.g. Before you book",
  },
  {
    key: "vii-collection.notes-gratuity",
    label: "Gratuity Note",
    description:
      "Short note about gratuity policy. Clear to hide this item.",
    type: "textarea",
    page: "homepage",
    group: "vii-collection.notes",
    gridColumn: "col-span-1",
    defaultValue: "A 15% gratuity is added to all services.",
    placeholder: "e.g. A 15% gratuity is added to all services.",
  },
  {
    key: "vii-collection.notes-cancellation",
    label: "Cancellation Policy",
    description:
      "Short note about cancellation or rescheduling. Clear to hide this item.",
    type: "textarea",
    page: "homepage",
    group: "vii-collection.notes",
    gridColumn: "col-span-1",
    defaultValue:
      "Please allow at least 48 hours' notice to cancel or reschedule an appointment.",
    placeholder: "e.g. Please allow at least 48 hours' notice…",
  },

  // Product Rail
  {
    key: "vii-collection.rail-overline",
    label: "Product Rail Overline",
    description: "Small caps label above the product rail heading.",
    type: "text",
    page: "homepage",
    group: "vii-collection.rail",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. Our favorites",
  },
  {
    key: "vii-collection.rail-heading",
    label: "Product Rail Heading",
    description: "Section heading for the featured product rail.",
    type: "text",
    page: "homepage",
    group: "vii-collection.rail",
    gridColumn: "col-span-1",
    defaultValue: "Take it home",
    placeholder: "e.g. Take it home",
  },
  {
    key: "vii-collection.rail-collection",
    label: "Product Rail Collection",
    description:
      "Pick a collection to feature. Defaults to your latest products when left empty.",
    type: "collection",
    page: "homepage",
    group: "vii-collection.rail",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-collection.rail-featured-only",
    label: "Show featured products only",
    description:
      "When no collection is selected: on shows only products you've marked Featured; off shows your most recent products.",
    type: "boolean",
    page: "homepage",
    group: "vii-collection.rail",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
  {
    key: "vii-collection.rail-cta-text",
    label: "Product Rail CTA Text",
    description: "Text for the 'shop all' link below the product rail.",
    type: "text",
    page: "homepage",
    group: "vii-collection.rail",
    gridColumn: "col-span-1",
    defaultValue: "Shop all products",
    placeholder: "e.g. Shop all products",
  },
  {
    key: "vii-collection.rail-cta-url",
    label: "Product Rail CTA URL",
    description: "URL the product rail CTA link points to.",
    type: "url",
    page: "homepage",
    group: "vii-collection.rail",
    gridColumn: "col-span-1",
    defaultValue: "/shop",
    placeholder: "/shop",
  },

  // Closing CTA
  {
    key: "vii-collection.cta-image",
    label: "Closing CTA Image",
    description:
      "Background image for the closing contact CTA section (shown at 30% opacity behind the navy overlay).",
    type: "image",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "vii-collection.cta-heading",
    label: "Closing CTA Heading",
    description: "Large italic serif heading in the closing CTA block.",
    type: "text",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-1",
    defaultValue: "Reserve your appointment.",
    placeholder: "e.g. Reserve your appointment.",
  },
  {
    key: "vii-collection.cta-subheading",
    label: "Closing CTA Subheading",
    description: "Small all-caps line below the heading.",
    type: "text",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-1",
    defaultValue: "Detroit · By Appointment",
    placeholder: "e.g. Detroit · By Appointment",
  },
  {
    key: "vii-collection.cta-body",
    label: "Closing CTA Body",
    description: "Short paragraph inviting guests to book.",
    type: "textarea",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-full",
    defaultValue:
      "Our specialists are ready to help you book. Reach out to reserve your session.",
    placeholder: "Invite guests to book or call…",
  },
  {
    key: "vii-collection.cta-button-label",
    label: "Closing CTA Button Label",
    description:
      "Label for the primary action button in the closing CTA. Leave blank to hide the button.",
    type: "text",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "e.g. Book Now",
  },
  {
    key: "vii-collection.cta-button-url",
    label: "Closing CTA Button URL",
    description:
      "URL the CTA button links to (e.g. an external booking page). Required for the button to appear.",
    type: "url",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "https://…",
  },
  {
    key: "vii-collection.cta-embed",
    label: "Closing CTA Embed",
    description:
      "Optional embed (e.g. a booking widget) shown in the closing CTA section. Paste an embed URL or <iframe> snippet. When embeds are disabled, a fallback external link is shown instead.",
    type: "iframe",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "vii-collection.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open.",
    type: "boolean",
    page: "homepage",
    group: "vii-collection.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const viiCollectionFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-collection.hero",
    title: "Hero",
    description:
      "Optional single image or video (video takes precedence) and overline. Leave media blank for the minimal cream typographic hero.",
    icon: "🎬",
    columns: 1,
  },
  {
    id: "vii-collection.intro",
    title: "Introduction",
    description:
      "Optional overline, split heading, rich-text body, and an image or video below. Hidden entirely when left blank.",
    icon: "✍️",
    columns: 2,
  },
  {
    id: "vii-collection.sections",
    title: "Service Sections",
    description:
      "Define up to 4 named sections (e.g. Facials, Needling) to group your treatments. Each section supports an optional description and image or video header. Assign individual services to sections in the “Specific services” tab.",
    icon: "🗂️",
    columns: 1,
  },
  {
    id: "vii-collection.list",
    title: "Treatment List",
    description:
      "Optional heading and intro paragraph shown above the full treatment list.",
    icon: "📋",
    columns: 1,
  },
  {
    id: "vii-collection.notes",
    title: "Before You Book",
    description:
      "A short fine-print band shown under the treatment prices — gratuity and cancellation policy. Clear a line to hide it.",
    icon: "📝",
    columns: 2,
  },
  {
    id: "vii-collection.rail",
    title: "Product Rail",
    description:
      "A row of products shown below the notes. Defaults to your latest products; pick a collection to feature specific ones.",
    icon: "🛍️",
    columns: 2,
  },
  {
    id: "vii-collection.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, button, embed, and contact details for the closing navy CTA section.",
    icon: "📞",
    columns: 2,
  },
];

// ─── Exported defs ────────────────────────────────────────────────────────────

// ─── Bound field resolvers (one per template) ─────────────────────────────────

const _sanctuaryFieldMap = new Map<string, TemplateField>(
  viiSanctuaryFields.map((f) => [f.key, f]),
);

export function resolveSanctuaryFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _sanctuaryFieldMap);
}

const _ritualFieldMap = new Map<string, TemplateField>(
  viiRitualFields.map((f) => [f.key, f]),
);

export function resolveRitualFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _ritualFieldMap);
}

const _atelierFieldMap = new Map<string, TemplateField>(
  viiAtelierFields.map((f) => [f.key, f]),
);

export function resolveAtelierFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _atelierFieldMap);
}

const _ledgerFieldMap = new Map<string, TemplateField>(
  viiLedgerFields.map((f) => [f.key, f]),
);

export function resolveLedgerFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _ledgerFieldMap);
}

const _collectionFieldMap = new Map<string, TemplateField>(
  viiCollectionFields.map((f) => [f.key, f]),
);

export function resolveCollectionFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _collectionFieldMap);
}

// ─── Exported defs ────────────────────────────────────────────────────────────

export const viiServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "vii-sanctuary",
    label: "Sanctuary",
    description:
      "Immersive full-viewport hero (video or image), centred intro with optional media, benefits strip, and a three-column treatment card grid with Book CTAs.",
    fields: viiSanctuaryFields,
    fieldGroups: viiSanctuaryFieldGroups,
  },
  {
    id: "vii-ritual",
    label: "Ritual",
    description:
      "Intimate editorial layout: centred dark hero (video or image), philosophy block with optional media, and treatments as alternating full-bleed image/text rows — each with a Book CTA.",
    fields: viiRitualFields,
    fieldGroups: viiRitualFieldGroups,
  },
  {
    id: "vii-atelier",
    label: "Atelier",
    description:
      "Gallery-forward mosaic hero (or hero video), a large italic pull quote on navy with optional media, and a refined two-column treatment table with inline Book links.",
    fields: viiAtelierFields,
    fieldGroups: viiAtelierFieldGroups,
  },
  {
    id: "vii-ledger",
    label: "Ledger",
    description:
      "Minimal, type-led layout for services without photography: a cream typographic hero (or an optional single image/video), an optional centred intro, and a refined two-column treatment table with inline Book links.",
    fields: viiLedgerFields,
    fieldGroups: viiLedgerFieldGroups,
  },
  {
    id: "vii-collection",
    label: "Collection (sectioned)",
    description:
      "Minimal type-led service page that groups treatments into sections (e.g. Facials, Needling, Dermaplaning). Each section can have an optional description and image or video header.",
    fields: viiCollectionFields,
    fieldGroups: viiCollectionFieldGroups,
  },
];
