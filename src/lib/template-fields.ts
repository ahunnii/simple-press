import type { JSONContent } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import { Leaf } from "lucide-react";
import { z } from "zod";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { DEFAULT_EMBED_HEIGHT, sanitizeEmbedSrc } from "~/lib/embed";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import {
  bambooData,
  bambooFieldGroups,
} from "~/app/(storefront)/_templates/bamboo";
import {
  darkTrendData,
  darkTrendFieldGroups,
} from "~/app/(storefront)/_templates/dark-trend";
import {
  defaultTemplateData,
  defaultTemplateFieldGroups,
} from "~/app/(storefront)/_templates/default";
import {
  elegantData,
  elegantFieldGroups,
} from "~/app/(storefront)/_templates/elegant";
import {
  happyBambooData,
  happyBambooFieldGroups,
} from "~/app/(storefront)/_templates/happy-bamboo";
import {
  modernData,
  modernFieldGroups,
} from "~/app/(storefront)/_templates/modern";
import {
  noiseData,
  noiseFieldGroups,
} from "~/app/(storefront)/_templates/noise";
import {
  pollenData,
  pollenFieldGroups,
} from "~/app/(storefront)/_templates/pollen";
import {
  sledgeData,
  sledgeFieldGroups,
} from "~/app/(storefront)/_templates/sledge";
import { viiData, viiFieldGroups } from "~/app/(storefront)/_templates/vii";

export type TemplatePage =
  | "homepage"
  | "contact"
  | "product"
  | "products"
  | "about"
  | "blog"
  | "collections"
  | "shop"
  | "cart"
  | "checkout"
  | "global"
  | "testimonials";

export type TemplateListItemField = {
  key: string;
  label: string;
  description?: string;
  type: "text" | "textarea" | "image" | "video" | "url" | "icon";
  placeholder?: string;
};

type TemplateFieldCommon = {
  key: string;
  label: string;
  description: string;
  page: TemplatePage;
  defaultValue?: string;
  group?: string;
  gridColumn?: string;
  placeholder?: string;
};

export type TemplateFieldScalarType =
  | "text"
  | "textarea"
  | "richtext"
  | "url"
  | "color"
  | "number"
  | "gallery"
  | "iframe"
  | "image"
  | "video"
  | "boolean"
  | "collection";

export type TemplateField =
  | (TemplateFieldCommon & {
      type: TemplateFieldScalarType;
    })
  | (TemplateFieldCommon & {
      type: "list";
      itemSchema: TemplateListItemField[];
      minItems?: number;
      maxItems?: number;
    });

export type RichTextFieldValue = JSONContent & {
  type: "doc";
  content: JSONContent[];
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function getRichTextFieldValue(
  customFields: unknown,
  key: string,
): RichTextFieldValue | null {
  if (!isObjectRecord(customFields)) return null;
  const value = customFields[key];
  if (!isObjectRecord(value)) return null;
  if (value.type !== "doc" || !Array.isArray(value.content)) return null;
  return value as RichTextFieldValue;
}

/** One row in a template list field; `_id` is for admin/editor stable keys. */
export type TemplateListRow = Record<string, unknown> & { _id?: string };

function newListRowId(index: number): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `row-${index}-${Date.now()}`;
}

export function parseTemplateListRows(raw: unknown): TemplateListRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    if (!isObjectRecord(item)) {
      return { _id: newListRowId(index) };
    }
    const row = { ...item } as TemplateListRow;
    if (typeof row._id !== "string" || !row._id) {
      row._id = newListRowId(index);
    }
    return row;
  });
}

/**
 * Parses a raw `customFields` value for a richtext field.
 *
 * - If the value is a non-null, non-array object → return it cast as TiptapJSON
 *   (admin editor stores Tiptap JSON objects directly).
 * - If it's a non-empty string → JSON.parse inside try/catch (return null on failure).
 * - Otherwise return null.
 */
export function parseTemplateRichtext(value: unknown): TiptapJSON | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as TiptapJSON;
  }
  if (typeof value === "string" && value) {
    try {
      return JSON.parse(value) as TiptapJSON;
    } catch {
      return null;
    }
  }
  return null;
}

export function getListFieldValue(
  customFields: unknown,
  key: string,
): unknown[] | null {
  if (!isObjectRecord(customFields)) return null;
  const value = customFields[key];
  return Array.isArray(value) ? value : null;
}

const genericIconRowSchema = z
  .object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })
  .passthrough();

export const genericTextRowSchema = z
  .object({
    title: z.string(),
    description: z.string(),
  })
  .passthrough();

export const genericImageRowSchema = z
  .object({
    image: z.string(),
    label: z.string(),
    description: z.string().optional(),
  })
  .passthrough();

export const genericFAQRowSchema = z
  .object({
    question: z.string(),
    answer: z.string(),
  })
  .passthrough();

export const genericTrustBadgeRowSchema = z
  .object({
    icon: z.string().optional(),
    label: z.string(),
  })
  .passthrough();

export type GenericIconRow = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export type GenericTextRow = {
  title: string;
  description: string;
};

export type GenericFAQRow = {
  question: string;
  answer: string;
};

export type GenericImageRow = {
  image: string;
  label: string;
  description?: string;
};

export type GenericTrustBadgeRow = {
  icon?: LucideIcon;
  label: string;
};
export function parseTemplateIconListRows(
  raw: unknown,
  defaultList?: GenericIconRow[],
) {
  if (!Array.isArray(raw)) return defaultList ?? [];

  const out: GenericIconRow[] = [];
  for (const row of raw) {
    const parsed = genericIconRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { icon, title, description } = parsed.data;
    const Icon = getLucideTemplateIcon(icon) ?? Leaf;
    out.push({ icon: Icon, title, description });
  }

  return out.length > 0 ? out : (defaultList ?? null);
}

export function parseTemplateTrustBadgesListRows(
  raw: unknown,
  defaultList?: GenericTrustBadgeRow[],
) {
  if (!Array.isArray(raw)) return defaultList ?? [];

  const out: GenericTrustBadgeRow[] = [];
  for (const row of raw) {
    const parsed = genericTrustBadgeRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { icon, label } = parsed.data;
    const Icon = icon ? getLucideTemplateIcon(icon) : undefined;
    out.push({ icon: Icon ?? undefined, label });
  }

  return out.length > 0 ? out : (defaultList ?? null);
}

export function parseTemplateTextListRows(
  raw: unknown,
  defaultList?: GenericTextRow[],
) {
  if (!Array.isArray(raw)) return defaultList ?? [];

  const out: GenericTextRow[] = [];
  for (const row of raw) {
    const parsed = genericTextRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { title, description } = parsed.data;
    out.push({ title, description });
  }

  return out.length > 0 ? out : (defaultList ?? null);
}

export function parseTemplateFAQListRows(
  raw: unknown,
  defaultList?: GenericFAQRow[],
) {
  if (!Array.isArray(raw)) return defaultList ?? [];

  const out: GenericFAQRow[] = [];
  for (const row of raw) {
    const parsed = genericFAQRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { question, answer } = parsed.data;
    out.push({ question, answer });
  }

  return out.length > 0 ? out : (defaultList ?? null);
}

export function parseTemplateImageListRows(
  raw: unknown,
  defaultList?: GenericImageRow[],
) {
  if (!Array.isArray(raw)) return defaultList ?? [];

  const out: GenericImageRow[] = [];
  for (const row of raw) {
    const parsed = genericImageRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { image, label, description } = parsed.data;
    out.push({ image, label, description });
  }

  return out.length > 0 ? out : (defaultList ?? null);
}

/** Validated value for a template field of type `"iframe"`. */
export type TemplateIframeValue = {
  src: string;
  height: number;
  title: string;
};

/**
 * Parses a raw `customFields` value for an iframe field.
 *
 * Expects a non-empty JSON string encoding `{ src, height?, title? }`.
 * `src` is run through `sanitizeEmbedSrc` — returns `null` when the URL is
 * invalid or not HTTPS. `height` defaults to `DEFAULT_EMBED_HEIGHT` when
 * absent or non-positive. `title` defaults to `""`.
 */
export function parseTemplateIframeValue(
  raw: unknown,
): TemplateIframeValue | null {
  if (typeof raw !== "string" || !raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.src !== "string") return null;
  const safeSrc = sanitizeEmbedSrc(obj.src);
  if (!safeSrc) return null;

  const rawHeight = Number(obj.height);
  const height =
    Number.isFinite(rawHeight) && rawHeight > 0
      ? rawHeight
      : DEFAULT_EMBED_HEIGHT;

  const title = typeof obj.title === "string" ? obj.title : "";

  return { src: safeSrc, height, title };
}

export type TemplateFieldGroup = {
  id: string;
  title: string;
  description?: string;
  icon?: string; // Emoji or icon identifier
  columns?: number; // Grid columns (1-3, default 1)
};

// Define groups for each template
export const TEMPLATE_FIELD_GROUPS: Record<string, TemplateFieldGroup[]> = {
  ...bambooFieldGroups,
  ...pollenFieldGroups,
  ...darkTrendFieldGroups,
  ...modernFieldGroups,
  ...happyBambooFieldGroups,
  ...noiseFieldGroups,
  ...sledgeFieldGroups,
  ...elegantFieldGroups,
  ...viiFieldGroups,
  ...defaultTemplateFieldGroups,
};

export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  vintage: [
    {
      key: "vintage.tagline",
      label: "Tagline",
      description: "Your store's tagline",
      type: "text",
      page: "global",
    },
    {
      key: "vintage.welcome",
      label: "Welcome Message",
      description: "Greeting message for visitors",
      type: "textarea",
      page: "global",
    },
    {
      key: "vintage.signature",
      label: "Signature",
      description: "Personal signature or sign-off",
      type: "text",
      page: "global",
    },
  ],
  minimal: [
    {
      key: "minimal.motto",
      label: "Motto",
      description: "Short motto or slogan",
      type: "text",
      page: "global",
    },
    {
      key: "minimal.statement",
      label: "Brand Statement",
      description: "Your brand's mission statement",
      type: "textarea",
      page: "global",
    },
  ],

  ...bambooData,
  ...darkTrendData,
  ...pollenData,
  ...modernData,
  ...happyBambooData,
  ...noiseData,
  ...sledgeData,
  ...elegantData,
  ...viiData,
  ...defaultTemplateData,
};

/**
 * Returns only the custom field values that belong to the given template.
 * Keys are those defined in TEMPLATE_FIELDS for that templateId; missing values default to "".
 * List fields (`type: "list"`) are omitted — use `getListFieldValue` / `parseTemplateListRows` instead.
 * Accepts Prisma JsonValue (e.g. from siteContent.customFields).
 */
export function getThemeFields(
  templateId: string,
  customFields: unknown,
): Record<string, string> {
  const fields = TEMPLATE_FIELDS[templateId] ?? [];
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, unknown>)
      : {};
  const result: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "list") continue;
    const value = raw[field.key];
    result[field.key] = typeof value === "string" ? value : "";
  }
  return result;
}

export function groupFieldsByGroup(
  fields: TemplateField[],
): Record<string, TemplateField[]> {
  const grouped: Record<string, TemplateField[]> = {
    ungrouped: [], // Fields without a group
  };

  fields.forEach((field) => {
    const groupId = field.group ?? "ungrouped";
    grouped[groupId] ??= [];
    grouped[groupId].push(field);
  });

  return grouped;
}

// Helper to get group metadata
export function getGroupMetadata(
  templateId: string,
  groupId: string,
): TemplateFieldGroup | undefined {
  return TEMPLATE_FIELD_GROUPS[templateId]?.find((g) => g.id === groupId);
}

// Helper to group fields by page
export function groupFieldsByPage(
  templateId: string,
): Record<string, TemplateField[]> {
  const fields = TEMPLATE_FIELDS[templateId] ?? [];
  const grouped: Record<string, TemplateField[]> = {};

  fields.forEach((field) => {
    if (!grouped[field.page ?? "global"]) {
      grouped[field.page] = [];
    }
    grouped[field.page]!.push(field);
  });

  return grouped;
}

// Page metadata
export const PAGE_METADATA = {
  global: {
    title: "Global",
    description: "Site-wide elements like headers and announcements",
    icon: "🌐",
  },
  homepage: {
    title: "Homepage",
    description: "Main landing page content",
    icon: "🏠",
  },
  products: {
    title: "Products",
    description: "Product listing and collection pages",
    icon: "📦",
  },
  product: {
    title: "Product",
    description: "Individual product page content",
    icon: "🏷️",
  },
  cart: {
    title: "Cart",
    description: "Shopping cart page content",
    icon: "🛒",
  },
  checkout: {
    title: "Checkout",
    description: "Checkout and order confirmation",
    icon: "💳",
  },
  contact: {
    title: "Contact",
    description: "Contact page content",
    icon: "📧",
  },
  about: {
    title: "About",
    description: "About page content",
    icon: "ℹ️",
  },
  blog: {
    title: "Blog",
    description: "Blog page content",
    icon: "📝",
  },
  testimonials: {
    title: "Testimonials",
    description: "Testimonials page content",
    icon: "💬",
  },
  collections: {
    title: "Collections",
    description: "Collections page content",
    icon: "📂",
  },
} as const;

export { resolveTemplateFields } from "~/lib/resolve-template-fields";

export function isContentEmpty(content: TiptapJSON): boolean {
  if (content === null || content === undefined) {
    return true;
  }

  if (typeof content === "string") {
    return content === "";
  }

  if (Array.isArray(content)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return content.every((item) => isContentEmpty(item));
  }

  if (!content.content) {
    return true;
  }

  return content.content.every((item) => !item.content);
}
