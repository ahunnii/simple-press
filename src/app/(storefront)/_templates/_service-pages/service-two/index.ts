/**
 * Service template: service-two — Media-Rich
 *
 * Fields: hero video, gallery, intro body (richtext), highlight list
 * (icon + title + description per row).
 * Adapts to the active storefront CSS variables (no fixed palette).
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const serviceTwoFields: TemplateField[] = [
  // ── Hero video ────────────────────────────────────────────────────────────
  {
    key: "service-two.hero-video",
    label: "Hero Video",
    description:
      "Autoplay background video at the top of the service page (YouTube, Vimeo, or direct URL)",
    type: "video",
    page: "homepage",
    group: "service-two.hero",
    gridColumn: "col-span-full",
  },

  // ── Gallery ───────────────────────────────────────────────────────────────
  {
    key: "service-two.gallery",
    label: "Photo Gallery",
    description: "Grid of images showcasing this service",
    type: "gallery",
    page: "homepage",
    group: "service-two.gallery",
    gridColumn: "col-span-full",
  },

  // ── Intro body ────────────────────────────────────────────────────────────
  {
    key: "service-two.intro-body",
    label: "Intro Body",
    description: "Rich text description of this service",
    type: "richtext",
    page: "homepage",
    group: "service-two.intro",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Describe this service in detail...",
  },

  // ── Highlight list ────────────────────────────────────────────────────────
  {
    key: "service-two.highlight-list",
    label: "Highlights",
    description: "Key selling points shown as icon cards",
    type: "list",
    page: "homepage",
    group: "service-two.highlights",
    gridColumn: "col-span-full",
    itemSchema: [
      {
        key: "icon",
        label: "Icon",
        type: "icon",
        description: "Lucide icon name for this highlight",
      },
      {
        key: "title",
        label: "Title",
        type: "text",
        description: "Short card heading",
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        description: "Supporting text for the card",
      },
    ],
    minItems: 0,
    maxItems: 6,
  },
];

export const serviceTwoFieldGroups: TemplateFieldGroup[] = [
  {
    id: "service-two.hero",
    title: "Hero Video",
    description: "Full-width video banner at the top of the page",
    icon: "🎬",
    columns: 1,
  },
  {
    id: "service-two.gallery",
    title: "Photo Gallery",
    description: "Curated image gallery for this service",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "service-two.intro",
    title: "Introduction",
    description: "Rich-text description of the service",
    icon: "📝",
    columns: 1,
  },
  {
    id: "service-two.highlights",
    title: "Highlights",
    description: "Icon card list of key selling points",
    icon: "✨",
    columns: 1,
  },
];

const _fieldMap = new Map(serviceTwoFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
