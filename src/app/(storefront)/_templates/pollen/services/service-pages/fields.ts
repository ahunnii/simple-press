/**
 * Pollen-specific service-page template field definitions.
 *
 * Three visually distinct layouts — all unmistakably pollen (rounded cards,
 * soft shadows, and the shared pollen green/cream palette; system-sans
 * throughout, no custom font pairing):
 *
 *  pollen-spa   — Serene editorial: hero banner + two-column intro + 3-col card grid
 *  pollen-bloom — Gallery-forward: mosaic accent images + image-heavy staggered cards
 *  pollen-list  — Elegant list: minimal hero strip + alternating image/text rows
 *
 * Field key convention: "<def-id>.<field-slug>"
 */
import type { ServiceTemplateDef } from "~/lib/service-templates";
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

// ─── pollen-spa ───────────────────────────────────────────────────────────────

const pollenSpaFields: TemplateField[] = [
  // Hero
  {
    key: "pollen-spa.hero-image",
    label: "Background image",
    description:
      "Full-width image shown behind the service name. Leave blank to use this service's own photo, or the site-wide header background if it has none.",
    type: "image",
    page: "homepage",
    group: "pollen-spa.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "pollen-spa.hero-video",
    label: "Background video",
    description:
      "Optional background video; takes precedence over the background image. Use .mp4 or .webm.",
    type: "video",
    page: "homepage",
    group: "pollen-spa.hero",
    gridColumn: "col-span-full",
  },

  // Intro section
  {
    key: "pollen-spa.intro-label",
    label: "Small label",
    description: "Short line above the intro heading, e.g. Our Approach.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.intro",
    gridColumn: "col-span-full",
    defaultValue: "Our Approach",
    placeholder: "Our Approach",
  },
  {
    key: "pollen-spa.intro-heading",
    label: "Heading",
    description: "Main heading for the intro section.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.intro",
    gridColumn: "col-span-full",
    defaultValue: "A Thoughtful Experience",
    placeholder: "A Thoughtful Experience",
  },
  {
    key: "pollen-spa.intro-body",
    label: "Body text",
    description: "Rich-text description of this service group.",
    type: "richtext",
    page: "homepage",
    group: "pollen-spa.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe what makes this service special...",
  },
  {
    key: "pollen-spa.intro-accent-image",
    label: "Accent image",
    description:
      "Supporting image shown beside the intro text (portrait orientation works best). Leave blank to hide.",
    type: "image",
    page: "homepage",
    group: "pollen-spa.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "pollen-spa.intro-video",
    label: "Accent video",
    description:
      "Optional video beside the intro text; takes precedence over the accent image when set.",
    type: "video",
    page: "homepage",
    group: "pollen-spa.intro",
    gridColumn: "col-span-full",
  },

  // Items section heading
  {
    key: "pollen-spa.items-heading",
    label: "Heading",
    description: "Heading above the grid of individual services.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.items",
    gridColumn: "col-span-full",
    defaultValue: "Choose a service",
    placeholder: "Choose a service",
  },
  {
    key: "pollen-spa.items-subheading",
    label: "Subheading",
    description: "Optional line below the grid heading. Leave blank to hide.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.items",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "All treatments are tailored to your needs.",
  },
  {
    key: "pollen-spa.book-button-text",
    label: "Book button text",
    description: "Label on the booking button shown on each service card.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.items",
    gridColumn: "col-span-1",
    defaultValue: "Book",
    placeholder: "Book",
  },

  // CTA
  {
    key: "pollen-spa.closing-heading",
    label: "Closing heading",
    description:
      "Small line shown above the service name in the closing banner.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to begin?",
    placeholder: "Ready to begin?",
  },
  {
    key: "pollen-spa.cta-text",
    label: "Button text",
    description: "Label on the button below the intro.",
    type: "text",
    page: "homepage",
    group: "pollen-spa.cta",
    gridColumn: "col-span-1",
    defaultValue: "Get in Touch",
    placeholder: "Get in Touch",
  },
  {
    key: "pollen-spa.cta-link",
    label: "Button link",
    description: "Where the button below the intro goes. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "pollen-spa.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen-spa.cta-embed",
    label: "Booking embed",
    description:
      "Optional iframe embed (e.g. a booking widget) shown in the closing banner.",
    type: "iframe",
    page: "homepage",
    group: "pollen-spa.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "pollen-spa.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open. Only applies when a booking embed is set above.",
    type: "boolean",
    page: "homepage",
    group: "pollen-spa.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const pollenSpaFieldGroups: TemplateFieldGroup[] = [
  {
    id: "pollen-spa.hero",
    title: "Hero",
    description: "Full-width image at the top of the service page.",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "pollen-spa.intro",
    title: "Introduction",
    description:
      "Two-column intro section: label, heading, rich-text body, and accent image.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "pollen-spa.items",
    title: "Services grid",
    description: "Heading and subheading above the grid of individual services.",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "pollen-spa.cta",
    title: "Closing banner",
    description: "Optional button and booking embed shown below the intro.",
    icon: "📣",
    columns: 2,
  },
];

// ─── pollen-bloom ─────────────────────────────────────────────────────────────

const pollenBloomFields: TemplateField[] = [
  // Gallery mosaic
  {
    key: "pollen-bloom.gallery",
    label: "Accent gallery",
    description:
      "2-4 images shown in a mosaic grid at the top of the page (portrait images recommended). Add up to 4.",
    type: "list",
    page: "homepage",
    group: "pollen-bloom.gallery",
    gridColumn: "col-span-full",
    itemLabel: "photo",
    itemSchema: [
      {
        key: "image",
        label: "Image",
        type: "image",
        description: "Accent photo for the mosaic.",
      },
      {
        key: "alt",
        label: "Alt text",
        type: "text",
        description: "Brief description for screen readers.",
        optional: true,
      },
    ],
    minItems: 0,
    maxItems: 4,
  },
  {
    key: "pollen-bloom.hero-video",
    label: "Video band",
    description:
      "Optional background video shown as a full-width band before the gallery.",
    type: "video",
    page: "homepage",
    group: "pollen-bloom.gallery",
    gridColumn: "col-span-full",
  },

  // Intro
  {
    key: "pollen-bloom.intro-label",
    label: "Small label",
    description: "Short line above the intro heading.",
    type: "text",
    page: "homepage",
    group: "pollen-bloom.intro",
    gridColumn: "col-span-full",
    defaultValue: "What We Offer",
    placeholder: "What We Offer",
  },
  {
    key: "pollen-bloom.intro-heading",
    label: "Heading",
    description: "Main heading for the intro section.",
    type: "text",
    page: "homepage",
    group: "pollen-bloom.intro",
    gridColumn: "col-span-full",
    defaultValue: "Crafted for You",
    placeholder: "Crafted for You",
  },
  {
    key: "pollen-bloom.intro-body",
    label: "Body text",
    description: "Rich-text overview of this service group.",
    type: "richtext",
    page: "homepage",
    group: "pollen-bloom.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Share the philosophy behind your services...",
  },
  {
    key: "pollen-bloom.intro-image",
    label: "Accent image",
    description: "Optional supporting image shown below the intro text.",
    type: "image",
    page: "homepage",
    group: "pollen-bloom.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "pollen-bloom.intro-video",
    label: "Accent video",
    description:
      "Optional video shown in the intro section; takes precedence over the accent image when set.",
    type: "video",
    page: "homepage",
    group: "pollen-bloom.intro",
    gridColumn: "col-span-full",
  },

  // Items heading
  {
    key: "pollen-bloom.items-heading",
    label: "Heading",
    description: "Heading above the individual service cards.",
    type: "text",
    page: "homepage",
    group: "pollen-bloom.items",
    gridColumn: "col-span-full",
    defaultValue: "Available Services",
    placeholder: "Available Services",
  },
  {
    key: "pollen-bloom.book-button-text",
    label: "Book button text",
    description: "Label on the booking button shown on each service card.",
    type: "text",
    page: "homepage",
    group: "pollen-bloom.items",
    gridColumn: "col-span-1",
    defaultValue: "Book Now",
    placeholder: "Book Now",
  },

  // CTA
  {
    key: "pollen-bloom.closing-heading",
    label: "Closing heading",
    description:
      "Small line shown above the service name in the closing banner.",
    type: "text",
    page: "homepage",
    group: "pollen-bloom.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to begin?",
    placeholder: "Ready to begin?",
  },
  {
    key: "pollen-bloom.cta-text",
    label: "Button text",
    description: "Label on the button below the intro.",
    type: "text",
    page: "homepage",
    group: "pollen-bloom.cta",
    gridColumn: "col-span-1",
    defaultValue: "Book a Consultation",
    placeholder: "Book a Consultation",
  },
  {
    key: "pollen-bloom.cta-link",
    label: "Button link",
    description: "Where the button below the intro goes. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "pollen-bloom.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen-bloom.cta-embed",
    label: "Booking embed",
    description:
      "Optional iframe embed (e.g. a booking widget) shown in the closing banner.",
    type: "iframe",
    page: "homepage",
    group: "pollen-bloom.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "pollen-bloom.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open. Only applies when a booking embed is set above.",
    type: "boolean",
    page: "homepage",
    group: "pollen-bloom.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const pollenBloomFieldGroups: TemplateFieldGroup[] = [
  {
    id: "pollen-bloom.gallery",
    title: "Accent gallery",
    description: "2-4 images arranged in a mosaic at the top of the page.",
    icon: "🌸",
    columns: 1,
  },
  {
    id: "pollen-bloom.intro",
    title: "Introduction",
    description: "Label, heading, and rich-text overview for the service group.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "pollen-bloom.items",
    title: "Services section",
    description: "Heading above the image-heavy service cards.",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "pollen-bloom.cta",
    title: "Closing banner",
    description: "Optional button and booking embed shown below the intro.",
    icon: "📣",
    columns: 2,
  },
];

// ─── pollen-list ──────────────────────────────────────────────────────────────

const pollenListFields: TemplateField[] = [
  // Strip hero
  {
    key: "pollen-list.accent-color",
    label: "Accent stripe color",
    description: "Color of the thin decorative stripe above the page title.",
    type: "color",
    page: "homepage",
    group: "pollen-list.hero",
    gridColumn: "col-span-1",
    defaultValue: "#5e8b4a",
    placeholder: "#5e8b4a",
  },
  {
    key: "pollen-list.hero-video",
    label: "Background video",
    description:
      "Optional background video shown near the top of the page. Use .mp4 or .webm.",
    type: "video",
    page: "homepage",
    group: "pollen-list.hero",
    gridColumn: "col-span-full",
  },

  // Intro
  {
    key: "pollen-list.intro-label",
    label: "Small label",
    description: "Short line above the intro heading.",
    type: "text",
    page: "homepage",
    group: "pollen-list.intro",
    gridColumn: "col-span-full",
    defaultValue: "About This Service",
    placeholder: "About This Service",
  },
  {
    key: "pollen-list.intro-heading",
    label: "Heading",
    description: "Main heading for the intro block.",
    type: "text",
    page: "homepage",
    group: "pollen-list.intro",
    gridColumn: "col-span-full",
    defaultValue: "How We Can Help",
    placeholder: "How We Can Help",
  },
  {
    key: "pollen-list.intro-body",
    label: "Body text",
    description:
      "Rich-text description centered above the alternating rows.",
    type: "richtext",
    page: "homepage",
    group: "pollen-list.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Introduce this service category...",
  },
  {
    key: "pollen-list.intro-image",
    label: "Accent image",
    description:
      "Optional supporting image shown beside or below the intro text.",
    type: "image",
    page: "homepage",
    group: "pollen-list.intro",
    gridColumn: "col-span-full",
  },
  {
    key: "pollen-list.intro-video",
    label: "Accent video",
    description:
      "Optional video for the intro section; takes precedence over the accent image when set.",
    type: "video",
    page: "homepage",
    group: "pollen-list.intro",
    gridColumn: "col-span-full",
  },

  // Items section heading
  {
    key: "pollen-list.items-heading",
    label: "Heading",
    description: "Heading above the alternating image/text rows.",
    type: "text",
    page: "homepage",
    group: "pollen-list.items",
    gridColumn: "col-span-full",
    defaultValue: "Our Services",
    placeholder: "Our Services",
  },
  {
    key: "pollen-list.book-button-text",
    label: "Book button text",
    description: "Label on the booking button shown on each service row.",
    type: "text",
    page: "homepage",
    group: "pollen-list.items",
    gridColumn: "col-span-1",
    defaultValue: "Book This Service",
    placeholder: "Book This Service",
  },

  // CTA
  {
    key: "pollen-list.closing-heading",
    label: "Closing heading",
    description:
      "Small line shown above the service name in the closing banner.",
    type: "text",
    page: "homepage",
    group: "pollen-list.cta",
    gridColumn: "col-span-full",
    defaultValue: "Ready to begin?",
    placeholder: "Ready to begin?",
  },
  {
    key: "pollen-list.cta-text",
    label: "Button text",
    description: "Label on the footer button.",
    type: "text",
    page: "homepage",
    group: "pollen-list.cta",
    gridColumn: "col-span-1",
    defaultValue: "Schedule a Visit",
    placeholder: "Schedule a Visit",
  },
  {
    key: "pollen-list.cta-link",
    label: "Button link",
    description: "Where the footer button goes. Leave blank to hide the button.",
    type: "url",
    page: "homepage",
    group: "pollen-list.cta",
    gridColumn: "col-span-1",
    defaultValue: "/contact",
    placeholder: "/contact",
  },
  {
    key: "pollen-list.cta-embed",
    label: "Booking embed",
    description:
      "Optional iframe embed (e.g. a booking widget) shown in the closing band.",
    type: "iframe",
    page: "homepage",
    group: "pollen-list.cta",
    gridColumn: "col-span-full",
  },
  {
    key: "pollen-list.cta-embed-reveal",
    label: "Reveal booking behind a button",
    description:
      "When on, the booking widget is hidden until the visitor clicks a button, then expands open. Only applies when a booking embed is set above.",
    type: "boolean",
    page: "homepage",
    group: "pollen-list.cta",
    gridColumn: "col-span-1",
    defaultValue: "false",
  },
];

const pollenListFieldGroups: TemplateFieldGroup[] = [
  {
    id: "pollen-list.hero",
    title: "Hero accent",
    description: "Decorative color stripe above the page title.",
    icon: "🎨",
    columns: 2,
  },
  {
    id: "pollen-list.intro",
    title: "Introduction",
    description: "Label, heading, and rich-text body above the service rows.",
    icon: "📝",
    columns: 1,
  },
  {
    id: "pollen-list.items",
    title: "Services section",
    description: "Heading for the alternating image/text service rows.",
    icon: "🌿",
    columns: 1,
  },
  {
    id: "pollen-list.cta",
    title: "Closing banner",
    description: "Optional footer button.",
    icon: "📣",
    columns: 2,
  },
];

// ─── Resolver factories ───────────────────────────────────────────────────────

const _spaFieldMap = new Map(pollenSpaFields.map((f) => [f.key, f]));
const _bloomFieldMap = new Map(pollenBloomFields.map((f) => [f.key, f]));
const _listFieldMap = new Map(pollenListFields.map((f) => [f.key, f]));

export function resolvePollenSpaFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _spaFieldMap);
}

export function resolvePollenBloomFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _bloomFieldMap);
}

export function resolvePollenListFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _listFieldMap);
}

// ─── Exported defs ───────────────────────────────────────────────────────────

export const pollenServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "pollen-spa",
    label: "Serene Editorial",
    description:
      "Hero banner + two-column intro with accent image + a clean three-column treatment grid.",
    fields: pollenSpaFields,
    fieldGroups: pollenSpaFieldGroups,
  },
  {
    id: "pollen-bloom",
    label: "Gallery Forward",
    description:
      "Mosaic photo gallery at top + centered intro text + image-heavy service cards with a soft overlay on hover.",
    fields: pollenBloomFields,
    fieldGroups: pollenBloomFieldGroups,
  },
  {
    id: "pollen-list",
    label: "Elegant List",
    description:
      "Minimal hero strip + centered intro + alternating image/text rows for each service.",
    fields: pollenListFields,
    fieldGroups: pollenListFieldGroups,
  },
];
