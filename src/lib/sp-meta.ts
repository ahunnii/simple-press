import { getSectionsForTemplate } from "~/lib/template-sections";

/** Reserved key inside `SiteContent.customFields` for editor metadata. */
export const SP_META_KEY = "_sp";

export type SpSectionState = { hidden: boolean };

export type SpThemeSelection = { palette?: string; fonts?: string };

export type SpMeta = {
  /** Keyed by section id, e.g. "homepage.hero". */
  sections?: Record<string, SpSectionState>;
  theme?: SpThemeSelection;
};

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

  return result;
}

/** Convenience accessor over `getSpMeta(customFields).theme`. */
export function getThemeSelection(customFields: unknown): SpThemeSelection {
  return getSpMeta(customFields).theme ?? {};
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
