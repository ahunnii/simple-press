/**
 * Service template: service-three — Editorial
 *
 * Fields: hero image, subheading, body (richtext), secondary image, pull quote.
 * Designed for long-form editorial service pages.
 * Adapts to the active storefront CSS variables (no fixed palette).
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

export const serviceThreeFields: TemplateField[] = [
  // ── Hero ──────────────────────────────────────────────────────────────────
  {
    key: "service-three.hero-image",
    label: "Hero Image",
    description: "Full-bleed image at the top of the service page",
    type: "image",
    page: "homepage",
    group: "service-three.hero",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "service-three.subheading",
    label: "Subheading",
    description: "Short tagline displayed over or below the hero image",
    type: "text",
    page: "homepage",
    group: "service-three.hero",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. Crafted with intention",
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  {
    key: "service-three.body",
    label: "Body",
    description: "Main editorial body text for this service page",
    type: "richtext",
    page: "homepage",
    group: "service-three.body",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "Write the detailed service description here...",
  },

  // ── Secondary image ───────────────────────────────────────────────────────
  {
    key: "service-three.secondary-image",
    label: "Secondary Image",
    description: "Additional image placed within the editorial layout",
    type: "image",
    page: "homepage",
    group: "service-three.body",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },

  // ── Pull quote ────────────────────────────────────────────────────────────
  {
    key: "service-three.quote",
    label: "Pull Quote",
    description:
      "A standout quote or statement displayed prominently on the page",
    type: "textarea",
    page: "homepage",
    group: "service-three.quote",
    gridColumn: "col-span-full",
    defaultValue: "",
    placeholder: "e.g. The most relaxing experience I've ever had.",
  },
];

export const serviceThreeFieldGroups: TemplateFieldGroup[] = [
  {
    id: "service-three.hero",
    title: "Hero & Subheading",
    description: "Banner image and tagline",
    icon: "🖼️",
    columns: 1,
  },
  {
    id: "service-three.body",
    title: "Editorial Body",
    description: "Main text and supporting image",
    icon: "📖",
    columns: 1,
  },
  {
    id: "service-three.quote",
    title: "Pull Quote",
    description: "A standout quote or testimonial excerpt",
    icon: "💬",
    columns: 1,
  },
];

const _fieldMap = new Map(serviceThreeFields.map((f) => [f.key, f]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _fieldMap);
}
