import type { JSONContent } from "@tiptap/react";
import type { LucideIcon } from "lucide-react";
import { Leaf } from "lucide-react";
import { z } from "zod";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import type {
  EmbedAspectRatio,
  EmbedDisplayMode,
  EmbedWidth,
} from "~/lib/embed";
import {
  coerceEmbedAspectRatio,
  coerceEmbedDisplayMode,
  coerceEmbedWidth,
  DEFAULT_EMBED_HEIGHT,
  sanitizeEmbedSrc,
} from "~/lib/embed";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";
import { safeHref } from "~/lib/safe-href";
import {
  animatedBambooData,
  animatedBambooFieldGroups,
} from "~/app/(storefront)/_templates/animated-bamboo";
import {
  bambooData,
  bambooFieldGroups,
} from "~/app/(storefront)/_templates/bamboo";
import {
  buildersData,
  buildersFieldGroups,
} from "~/app/(storefront)/_templates/builders";
import { coopData, coopFieldGroups } from "~/app/(storefront)/_templates/coop";
import {
  darkTrendData,
  darkTrendFieldGroups,
} from "~/app/(storefront)/_templates/dark-trend";
import {
  defaultTemplateData,
  defaultTemplateFieldGroups,
} from "~/app/(storefront)/_templates/default";
import {
  dreamData,
  dreamFieldGroups,
} from "~/app/(storefront)/_templates/dream";
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
  oliveData,
  oliveFieldGroups,
} from "~/app/(storefront)/_templates/olive";
import { pinkData, pinkFieldGroups } from "~/app/(storefront)/_templates/pink";
import {
  pollenData,
  pollenFieldGroups,
} from "~/app/(storefront)/_templates/pollen";
import {
  relocationData,
  relocationFieldGroups,
} from "~/app/(storefront)/_templates/relocation";
import {
  sledgeData,
  sledgeFieldGroups,
} from "~/app/(storefront)/_templates/sledge";
import { umscData, umscFieldGroups } from "~/app/(storefront)/_templates/umsc";
import { viiData, viiFieldGroups } from "~/app/(storefront)/_templates/vii";
import {
  wealthData,
  wealthFieldGroups,
} from "~/app/(storefront)/_templates/wealth";

export type TemplatePage =
  | "homepage"
  | "contact"
  | "product"
  | "products"
  | "about"
  | "blog"
  | "collections"
  | "shop"
  | "services"
  | "events"
  | "donate"
  | "videos"
  | "faq"
  | "cart"
  | "checkout"
  | "global"
  | "testimonials";

export type TemplateListItemField = {
  key: string;
  label: string;
  /** Helper text rendered BELOW the input in the editors. Never used as a placeholder. */
  description?: string;
  type: "text" | "textarea" | "image" | "video" | "url" | "icon" | "boolean";
  placeholder?: string;
  /** Renders "(optional)" after the label. */
  optional?: boolean;
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
  /** Number fields only: minimum allowed value. */
  min?: number;
  /** Number fields only: maximum allowed value. */
  max?: number;
  /** Number fields only: increment step. */
  step?: number;
  /** Number fields only: unit label rendered alongside the value (e.g. "px", "%"). */
  unit?: string;
  /** Number fields only: renders a slider with a value readout instead of a bare number input. */
  control?: "slider";
  /**
   * Editors hide this field unless another field's current value equals
   * `equals`. "Current value" means the saved value for `key`, falling back
   * to that field's own `defaultValue` when unset.
   */
  visibleWhen?: { key: string; equals: string };
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
      /**
       * Sub-field key whose value titles a collapsed row in the editor.
       * Defaults to the first `text` sub-field, then the first `textarea`
       * sub-field, when omitted.
       */
      summaryKey?: string;
      /** Singular noun used for "Add <itemLabel>" / "<itemLabel> 3" labels. Defaults to "item". */
      itemLabel?: string;
      /**
       * When true, the storefront falls back to built-in rows if the saved
       * list is empty. Purely descriptive for the editor, which shows a hint
       * — the actual fallback behaviour lives in the template's own render code.
       */
      defaultsWhenEmpty?: boolean;
    })
  | (TemplateFieldCommon & {
      type: "faq";
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

/**
 * Row keys the templates render as an `href`.
 *
 * Hardcoded rather than derived from the row's `itemSchema` because
 * `parseTemplateListRows` is handed the raw stored array and never sees the
 * schema. These are the link keys actually in use across the template
 * registries (`key: "href" | "url" | "link"`), plus the three CTA spellings a
 * new template is likely to reach for. A key not listed here is treated as
 * ordinary text — add it here when a template starts rendering it as a link.
 */
const LINK_ROW_KEYS = [
  "href",
  "url",
  "link",
  "linkUrl",
  "ctaUrl",
  "buttonUrl",
] as const;

/**
 * Replaces unsafe link values in a stored list row with `""`.
 *
 * List rows live inside `customFields`, which is `z.any()` on the wire, so
 * this read-time pass is the only guard those values get. Non-link keys and
 * non-string values are left exactly as they were — the row's shape and every
 * other key round-trip untouched.
 */
function scrubRowLinks(row: TemplateListRow): TemplateListRow {
  for (const key of LINK_ROW_KEYS) {
    const value = row[key];
    if (typeof value !== "string" || value.trim() === "") continue;
    if (safeHref(value) === null) row[key] = "";
  }
  return row;
}

/**
 * Parses a raw stored list value into rows with stable `_id`s.
 *
 * Rows already carrying a non-empty `_id` keep it unchanged. A row without
 * one gets the deterministic id `row-${index}` (its position in the input
 * array) — deliberately NOT `crypto.randomUUID()`, which used to change on
 * every call and broke dnd-kit's sortable ids plus SSR/CSR row keys on
 * storefront pages that key by `row._id`. If `row-${index}` collides with an
 * `_id` already present elsewhere in the same list, a numeric suffix is
 * appended (`row-${index}-1`, `row-${index}-2`, …) until it's unique.
 */
export function parseTemplateListRows(raw: unknown): TemplateListRow[] {
  if (!Array.isArray(raw)) return [];

  const items = raw.map((item) =>
    isObjectRecord(item) ? ({ ...item } as TemplateListRow) : null,
  );

  const usedIds = new Set<string>();
  for (const item of items) {
    if (item && typeof item._id === "string" && item._id) {
      usedIds.add(item._id);
    }
  }

  return items.map((item, index) => {
    const row: TemplateListRow = item ?? {};
    if (typeof row._id !== "string" || !row._id) {
      let candidate = `row-${index}`;
      let suffix = 1;
      while (usedIds.has(candidate)) {
        candidate = `row-${index}-${suffix}`;
        suffix += 1;
      }
      row._id = candidate;
      usedIds.add(candidate);
    }
    return scrubRowLinks(row);
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

/**
 * Returns the SAVED string value for `key` from a `customFields` object, with
 * no default applied. Unlike `getThemeFields`/`resolveTemplateFields`, this
 * never falls back to a field's `defaultValue` — callers that need the raw
 * saved-or-absent distinction (e.g. deciding whether to show a "not set"
 * state) should use this instead.
 *
 * `customFields` is `z.any()` on the wire, so non-objects, arrays, and
 * non-string values at `key` all resolve to `undefined`.
 */
export function getRawCustomFieldString(
  customFields: unknown,
  key: string,
): string | undefined {
  if (!isObjectRecord(customFields)) return undefined;
  const value = customFields[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Collapses a string's internal whitespace/newlines into single spaces and
 * trims the ends. Used to render multi-line `textarea` sub-field values as a
 * single-line row summary.
 */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Derives the collapsed-row title shown for a `list` field's row in the
 * editors.
 *
 * Priority: `summaryKey`'s value (if given and non-empty after trimming) →
 * the first non-empty `text` sub-field (declaration order in `itemSchema`) →
 * the first non-empty `textarea` sub-field (whitespace/newlines collapsed to
 * single spaces) → `null` when nothing usable is found. Never truncates —
 * truncation is a CSS concern for the caller.
 */
export function getListRowSummary(
  row: Record<string, unknown>,
  itemSchema: TemplateListItemField[],
  summaryKey?: string,
): string | null {
  if (summaryKey) {
    const value = row[summaryKey];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }

  for (const field of itemSchema) {
    if (field.type !== "text") continue;
    const value = row[field.key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }

  for (const field of itemSchema) {
    if (field.type !== "textarea") continue;
    const value = row[field.key];
    if (typeof value !== "string") continue;
    const collapsed = collapseWhitespace(value);
    if (collapsed) return collapsed;
  }

  return null;
}

/**
 * Template field keys retired from the field registries — no template
 * declares them anymore — but whose values, if a site saved one before the
 * key was removed, must keep round-tripping: the admin "custom pairs" editor
 * hides them (there's no schema left to render an input for) while save
 * paths preserve them untouched, and any runtime code that still reads the
 * saved value (e.g. via `getRawCustomFieldString`) treats it as a read-only
 * fallback rather than dead data to discard.
 */
export const RETIRED_TEMPLATE_KEYS: ReadonlySet<string> = new Set([
  "bamboo.global.map-lat",
  "bamboo.global.map-lng",
  "bamboo.contact.hours",
  // vii, retired 2026-09-25 — the data now comes from Settings (map pin,
  // phone/email, city), Content → Branding (footer tagline, Instagram link),
  // or Admin → Testimonials. The Instagram feed/embed pair was already
  // declaration-free (orphaned saved values).
  "vii.contact.map-lat",
  "vii.contact.map-lng",
  "vii.about.cta-phone",
  "vii.about.cta-email",
  "vii.global.footer-tagline",
  "vii.global.location-tag",
  "vii.homepage.instagram-handle",
  "vii.homepage.testimonial-quote",
  "vii.homepage.testimonial-author",
  "vii.homepage.instagram-feed-url",
  "vii.homepage.instagram-embed",
]);

export function isRetiredTemplateKey(key: string): boolean {
  return RETIRED_TEMPLATE_KEYS.has(key);
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
    // Structurally a no-op today — `GenericIconRow` has no link key — but the
    // scrub runs here too so a link key added to the icon row later is
    // covered by the same rule as every other list row.
    const parsed = genericIconRowSchema.safeParse(
      isObjectRecord(row) ? scrubRowLinks({ ...row }) : row,
    );
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

/**
 * Parse a `type: "faq"` field value into ordered FaqItem ids.
 *
 * Empty / missing / leftover `{question,answer}` list rows are unset (`null`)
 * so the resolver can fall back to the first N published items.
 */
export function parseFaqPickerIds(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const ids: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const id = item.trim();
      if (id) ids.push(id);
      continue;
    }
    return null;
  }

  return ids.length > 0 ? ids : null;
}

/**
 * Resolve a contact (or other) FAQ teaser from a picker field + published
 * corpus. `published` is assumed already filtered and ordered by sortOrder.
 */
export function resolveFaqPickerItems<T extends { id: string }>(
  selected: unknown,
  published: T[],
  maxItems: number,
): T[] {
  const cap = Math.max(0, maxItems);
  if (cap === 0 || published.length === 0) return [];

  const ids = parseFaqPickerIds(selected);
  if (ids == null) return published.slice(0, cap);

  const byId = new Map(published.map((item) => [item.id, item]));
  const out: T[] = [];
  for (const id of ids) {
    if (out.length >= cap) break;
    const item = byId.get(id);
    if (item) out.push(item);
  }
  return out;
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
  /** Named aspect-ratio preset. Absent on legacy embeds — callers apply their own legacy logic. */
  aspectRatio?: EmbedAspectRatio;
  /** Named max-width preset. Absent on legacy embeds — callers default to full width. */
  maxWidth?: EmbedWidth;
  /** Display mode. Absent on legacy embeds — callers default to inline. */
  displayMode?: EmbedDisplayMode;
  /** Dialog trigger button label. Only meaningful when `displayMode === "dialog"`. */
  triggerLabel?: string;
};

/**
 * Parses a raw `customFields` value for an iframe field.
 *
 * Expects a non-empty JSON string encoding `{ src, height?, title?, aspectRatio?,
 * maxWidth?, displayMode?, triggerLabel? }`.
 * `src` is run through `sanitizeEmbedSrc` — returns `null` when the URL is
 * invalid or not HTTPS. `height` defaults to `DEFAULT_EMBED_HEIGHT` when
 * absent or non-positive. `title` defaults to `""`. The new optional fields
 * are validated against their respective unions via the `coerce*` helpers;
 * unrecognised values are silently dropped (backward compat).
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

  const result: TemplateIframeValue = { src: safeSrc, height, title };

  const aspectRatio = coerceEmbedAspectRatio(obj.aspectRatio);
  if (aspectRatio !== undefined) result.aspectRatio = aspectRatio;

  const maxWidth = coerceEmbedWidth(obj.maxWidth);
  if (maxWidth !== undefined) result.maxWidth = maxWidth;

  const displayMode = coerceEmbedDisplayMode(obj.displayMode);
  if (displayMode !== undefined) result.displayMode = displayMode;

  if (typeof obj.triggerLabel === "string" && obj.triggerLabel) {
    result.triggerLabel = obj.triggerLabel;
  }

  return result;
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
  ...animatedBambooFieldGroups,
  ...buildersFieldGroups,
  ...pollenFieldGroups,
  ...darkTrendFieldGroups,
  ...modernFieldGroups,
  ...happyBambooFieldGroups,
  ...noiseFieldGroups,
  ...sledgeFieldGroups,
  ...elegantFieldGroups,
  ...viiFieldGroups,
  ...coopFieldGroups,
  ...pinkFieldGroups,
  ...relocationFieldGroups,
  ...wealthFieldGroups,
  ...dreamFieldGroups,
  ...umscFieldGroups,
  ...oliveFieldGroups,

  ...defaultTemplateFieldGroups,
};

export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  ...bambooData,
  ...animatedBambooData,
  ...buildersData,
  ...darkTrendData,
  ...pollenData,
  ...modernData,
  ...happyBambooData,
  ...noiseData,
  ...sledgeData,
  ...elegantData,
  ...viiData,
  ...coopData,
  ...pinkData,
  ...relocationData,
  ...wealthData,
  ...dreamData,
  ...umscData,
  ...oliveData,

  ...defaultTemplateData,
};

/**
 * Returns only the custom field values that belong to the given template.
 * Keys are those defined in TEMPLATE_FIELDS for that templateId; missing values default to "".
 * List fields (`type: "list"`) and FAQ pickers (`type: "faq"`) are omitted —
 * use `getListFieldValue` / `parseTemplateListRows` / `resolveFaqPickerItems`.
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
    if (field.type === "list" || field.type === "faq") continue;
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

/**
 * Indexes a flat field list by `key`. Used to resolve a `visibleWhen`
 * condition's controlling field even when it lives in a different
 * group/page grouping than the field being tested — e.g. `fields` passed to
 * `isFieldVisible` may be scoped to one group, while `fieldsByKey` here
 * should span the whole template (or at least the whole page).
 */
export function buildFieldsByKey(
  fields: TemplateField[],
): Record<string, TemplateField> {
  const byKey: Record<string, TemplateField> = {};
  for (const field of fields) byKey[field.key] = field;
  return byKey;
}

/**
 * Resolves whether `field` should be shown to the owner, given the current
 * draft/saved values map and a `key`-indexed lookup of every field the
 * template defines (see `buildFieldsByKey`).
 *
 * A field with no `visibleWhen` is always visible. Otherwise the controlling
 * field's "current value" is its saved value in `values`, falling back to
 * that field's own `defaultValue`, falling back to `""` — matching the
 * contract documented on `TemplateFieldCommon.visibleWhen`.
 */
export function isFieldVisible(
  field: TemplateField,
  values: Record<string, unknown>,
  fieldsByKey: Record<string, TemplateField>,
): boolean {
  const condition = field.visibleWhen;
  if (!condition) return true;

  const raw = values[condition.key];
  const saved = typeof raw === "string" ? raw : undefined;
  const controlling = fieldsByKey[condition.key];
  const resolved = saved ?? controlling?.defaultValue ?? "";

  return resolved === condition.equals;
}

// Helper to group fields by page
export function groupFieldsByPage(
  templateId: string,
): Record<string, TemplateField[]> {
  const fields = TEMPLATE_FIELDS[templateId] ?? [];
  const grouped: Record<string, TemplateField[]> = {};

  fields.forEach((field) => {
    const page = field.page ?? "global";
    grouped[page] ??= [];
    grouped[page].push(field);
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
  services: {
    title: "Services",
    description: "Services index page content",
    icon: "🗂️",
  },
  events: {
    title: "Events",
    description: "Upcoming events listing page content",
    icon: "🎫",
  },
  videos: {
    title: "Videos",
    description: "Video gallery page content",
    icon: "📺",
  },
  donate: {
    title: "Donate",
    description: "Donations/tips page content",
    icon: "💝",
  },
  // Not a `TemplatePage` value — no field declares `page: "authentication"`.
  // The auth fields live on the `global` page; this entry exists so the visual
  // editor's synthetic "Authentication" preview page (which shows the shared
  // sign-in/sign-up shell) gets a first-class label and icon.
  authentication: {
    title: "Authentication",
    description: "Sign-in and sign-up screen styling",
    icon: "🔐",
  },
} as const;

export { resolveTemplateFields } from "~/lib/resolve-template-fields";

/**
 * Node types that are "leaf" content — they carry their meaning via `attrs`
 * rather than a nested `content` array (e.g. a standalone image has no
 * children, but is obviously not empty). Without this list, `isContentEmpty`
 * would misreport any richtext block containing only these nodes as blank,
 * silently hiding image-only sections/tabs.
 */
const LEAF_CONTENT_NODE_TYPES = new Set([
  "image",
  "horizontalRule",
  "hardBreak",
  "gallery",
  "embed",
]);

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

  if (
    typeof content.type === "string" &&
    LEAF_CONTENT_NODE_TYPES.has(content.type)
  ) {
    return false;
  }

  if (typeof content.text === "string" && content.text !== "") {
    return false;
  }

  if (!content.content) {
    return true;
  }

  return content.content.every((item) => isContentEmpty(item));
}
