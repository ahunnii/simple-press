import { getSectionsForTemplate } from "~/lib/template-sections";

/** Reserved key inside `SiteContent.customFields` for editor metadata. */
export const SP_META_KEY = "_sp";

export type SpSectionState = { hidden: boolean };

export type SpThemeSelection = { palette?: string; fonts?: string };

/**
 * How wide running text runs on pages set to Wide. "readable" (the default,
 * stored as absence) keeps the template's reading measure; "roomy" caps at
 * ~960px; "full" lines text up with the rows.
 */
export const TEXT_WIDTHS = ["readable", "roomy", "full"] as const;
export type SpTextWidth = (typeof TEXT_WIDTHS)[number];

export type SpLayout = { textWidth?: SpTextWidth };

export type SpMeta = {
  /** Keyed by section id, e.g. "homepage.hero". */
  sections?: Record<string, SpSectionState>;
  theme?: SpThemeSelection;
  layout?: SpLayout;
};

export function isSpTextWidth(value: unknown): value is SpTextWidth {
  return (
    typeof value === "string" &&
    (TEXT_WIDTHS as readonly string[]).includes(value)
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isSpSectionState(value: unknown): value is SpSectionState {
  return isObjectRecord(value) && typeof value.hidden === "boolean";
}

function isSpThemeSelection(value: unknown): value is SpThemeSelection {
  if (!isObjectRecord(value)) return false;
  if (value.palette !== undefined && typeof value.palette !== "string") {
    return false;
  }
  if (value.fonts !== undefined && typeof value.fonts !== "string") {
    return false;
  }
  return true;
}

/**
 * Safely reads the `_sp` editor-metadata namespace out of a `customFields`
 * value (which may be `null`, `undefined`, malformed JSON, or anything
 * else — this never throws). Returns `{}` when absent or malformed.
 */
export function getSpMeta(customFields: unknown): SpMeta {
  if (!isObjectRecord(customFields)) return {};
  const raw = customFields[SP_META_KEY];
  if (!isObjectRecord(raw)) return {};

  const result: SpMeta = {};

  if (isObjectRecord(raw.sections)) {
    const sections: Record<string, SpSectionState> = {};
    for (const [sectionId, state] of Object.entries(raw.sections)) {
      if (isSpSectionState(state)) {
        sections[sectionId] = { hidden: state.hidden };
      }
    }
    result.sections = sections;
  }

  if (isSpThemeSelection(raw.theme)) {
    result.theme = { ...raw.theme };
  }

  if (isObjectRecord(raw.layout) && isSpTextWidth(raw.layout.textWidth)) {
    result.layout = { textWidth: raw.layout.textWidth };
  }

  return result;
}

/** Convenience accessor over `getSpMeta(customFields).theme`. */
export function getThemeSelection(customFields: unknown): SpThemeSelection {
  return getSpMeta(customFields).theme ?? {};
}

/**
 * The site-wide "Text width on wide pages" choice. Unset / malformed →
 * "readable" (the template's own measure).
 */
export function getTextWidth(customFields: unknown): SpTextWidth {
  return getSpMeta(customFields).layout?.textWidth ?? "readable";
}

/**
 * The CSS value `--sp-text-width` should take for a choice, or `null` when
 * the template default applies (so no override is emitted at all).
 */
export function textWidthCssValue(width: SpTextWidth): string | null {
  if (width === "roomy") return "960px";
  if (width === "full") return "none";
  return null;
}

/**
 * Immutably sets a section's hidden state inside `customFields._sp.sections`,
 * preserving all other top-level keys and all other `_sp` content.
 */
export function setSectionHidden(
  customFields: Record<string, unknown>,
  sectionId: string,
  hidden: boolean,
): Record<string, unknown> {
  const existingSpRaw = isObjectRecord(customFields[SP_META_KEY])
    ? customFields[SP_META_KEY]
    : {};

  const existingSections = isObjectRecord(existingSpRaw.sections)
    ? existingSpRaw.sections
    : {};

  const nextSp: Record<string, unknown> = {
    ...existingSpRaw,
    sections: {
      ...existingSections,
      [sectionId]: { hidden },
    },
  };

  return {
    ...customFields,
    [SP_META_KEY]: nextSp,
  };
}

/**
 * Immutably sets (or clears, when `presetId` is undefined) one theme
 * selection inside `customFields._sp.theme`, preserving all other keys.
 */
export function setThemeSelection(
  customFields: Record<string, unknown>,
  kind: "palette" | "fonts",
  presetId: string | undefined,
): Record<string, unknown> {
  const existingSpRaw = isObjectRecord(customFields[SP_META_KEY])
    ? customFields[SP_META_KEY]
    : {};

  const existingTheme = isSpThemeSelection(existingSpRaw.theme)
    ? existingSpRaw.theme
    : {};

  const nextTheme: SpThemeSelection = { ...existingTheme };
  if (presetId === undefined) delete nextTheme[kind];
  else nextTheme[kind] = presetId;

  return {
    ...customFields,
    [SP_META_KEY]: {
      ...existingSpRaw,
      theme: nextTheme,
    },
  };
}

/**
 * Immutably sets (or clears, when `value` is undefined or "readable")
 * `customFields._sp.layout.textWidth`, preserving all other keys. Clearing
 * drops an emptied `layout` object entirely.
 */
export function setTextWidth(
  customFields: Record<string, unknown>,
  value: SpTextWidth | undefined,
): Record<string, unknown> {
  const existingSpRaw = isObjectRecord(customFields[SP_META_KEY])
    ? customFields[SP_META_KEY]
    : {};

  const { layout: existingLayoutRaw, ...spWithoutLayout } = existingSpRaw;
  const existingLayout = isObjectRecord(existingLayoutRaw)
    ? existingLayoutRaw
    : {};
  const nextLayout: Record<string, unknown> = { ...existingLayout };
  delete nextLayout.textWidth;
  if (value !== undefined && value !== "readable") {
    nextLayout.textWidth = value;
  }

  const nextSp: Record<string, unknown> = { ...spWithoutLayout };
  if (Object.keys(nextLayout).length > 0) nextSp.layout = nextLayout;

  return {
    ...customFields,
    [SP_META_KEY]: nextSp,
  };
}

/**
 * Whether a section should be rendered on the storefront. The owner's
 * stored `_sp.sections[sectionId].hidden` wins if present; otherwise falls
 * back to the section's `defaultHidden` from the section registry. Unknown
 * section ids are always visible.
 */
export function isSectionVisible(
  customFields: unknown,
  templateId: string,
  sectionId: string,
): boolean {
  const meta = getSpMeta(customFields);
  const stored = meta.sections?.[sectionId];
  if (stored) return !stored.hidden;

  const section = getSectionsForTemplate(templateId).find(
    (s) => s.id === sectionId,
  );
  if (!section) return true;

  return !section.defaultHidden;
}
