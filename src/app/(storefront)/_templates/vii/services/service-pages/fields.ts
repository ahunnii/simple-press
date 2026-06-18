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
    description:
      "Full-viewport hero image. Used when no video is configured.",
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
    key: "vii-sanctuary.cta-phone",
    label: "Phone Number",
    description: "Phone number shown in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. (313) 555-0100",
  },
  {
    key: "vii-sanctuary.cta-email",
    label: "Email Address",
    description: "Email address shown in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-sanctuary.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. hello@skanbarvii.com",
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
      "Overline, split heading, and rich-text body block below the hero",
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
      "Background image, heading, body copy, and contact details for the closing navy CTA section",
    icon: "📞",
    columns: 2,
  },
];

// ─── vii-ritual ───────────────────────────────────────────────────────────────

export const viiRitualFields: TemplateField[] = [
  // Hero
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
    key: "vii-ritual.cta-phone",
    label: "Phone Number",
    description: "Phone number shown in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. (313) 555-0100",
  },
  {
    key: "vii-ritual.cta-email",
    label: "Email Address",
    description: "Email address shown in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-ritual.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. hello@skanbarvii.com",
  },
];

const viiRitualFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-ritual.hero",
    title: "Hero",
    description:
      "Background image and overline text for the centred dark hero section",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "vii-ritual.philosophy",
    title: "Philosophy",
    description:
      "Overline, split heading, and rich-text body for the philosophy block shown between the hero and treatment steps",
    icon: "💭",
    columns: 2,
  },
  {
    id: "vii-ritual.cta",
    title: "Closing Call to Action",
    description:
      "Background image, heading, body copy, and contact details for the closing navy CTA",
    icon: "📞",
    columns: 2,
  },
];

// ─── vii-atelier ──────────────────────────────────────────────────────────────

export const viiAtelierFields: TemplateField[] = [
  // Hero gallery + overline
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
    defaultValue:
      "Every skin has a story. We listen before we touch.",
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
    key: "vii-atelier.cta-phone",
    label: "Phone Number",
    description: "Phone number shown in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. (313) 555-0100",
  },
  {
    key: "vii-atelier.cta-email",
    label: "Email Address",
    description: "Email address shown in the closing CTA.",
    type: "text",
    page: "homepage",
    group: "vii-atelier.cta",
    gridColumn: "col-span-1",
    defaultValue: "",
    placeholder: "e.g. hello@skanbarvii.com",
  },
];

const viiAtelierFieldGroups: TemplateFieldGroup[] = [
  {
    id: "vii-atelier.gallery",
    title: "Mosaic Gallery",
    description:
      "Overline text and up to 5 images that compose the full-viewport mosaic hero grid",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "vii-atelier.quote",
    title: "Pull Quote",
    description:
      "Brand statement or client quote displayed on the dark navy band between the gallery and the treatment list",
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
      "Background image, heading, body copy, and contact details for the closing navy CTA",
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

// ─── Exported defs ────────────────────────────────────────────────────────────

export const viiServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "vii-sanctuary",
    label: "Sanctuary",
    description:
      "Immersive full-viewport hero (video or image), centred intro, benefits strip, and a three-column treatment card grid with Book CTAs.",
    fields: viiSanctuaryFields,
    fieldGroups: viiSanctuaryFieldGroups,
  },
  {
    id: "vii-ritual",
    label: "Ritual",
    description:
      "Intimate editorial layout: centred dark hero, philosophy block, and treatments as alternating full-bleed image/text rows — each with a Book CTA.",
    fields: viiRitualFields,
    fieldGroups: viiRitualFieldGroups,
  },
  {
    id: "vii-atelier",
    label: "Atelier",
    description:
      "Gallery-forward mosaic hero, a large italic pull quote on navy, and a refined two-column treatment table with inline Book links.",
    fields: viiAtelierFields,
    fieldGroups: viiAtelierFieldGroups,
  },
];
