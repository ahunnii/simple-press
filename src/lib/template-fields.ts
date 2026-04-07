import type { JSONContent } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import { Heart, Leaf, Recycle, Shield } from "lucide-react";
import { z } from "zod";

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
  pollenData,
  pollenFieldGroups,
} from "~/app/(storefront)/_templates/pollen";

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
  | "global";

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
  | "image"
  | "video"
  | "boolean";

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

export type GenericIconRow = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function parseTemplateIconListRows(raw: unknown) {
  if (!Array.isArray(raw)) return null;

  const out: GenericIconRow[] = [];
  for (const row of raw) {
    const parsed = genericIconRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const { icon, title, description } = parsed.data;
    const Icon = getLucideTemplateIcon(icon) ?? Leaf;
    out.push({ icon: Icon, title, description });
  }

  return out.length > 0 ? out : null;
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
  ...elegantFieldGroups,
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
  ...elegantData,
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
} as const;
