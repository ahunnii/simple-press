import type { GenericTextRow } from "~/lib/template-fields";
import {
  getListFieldValue,
  getRawCustomFieldString,
  parseTemplateTextListRows,
} from "~/lib/template-fields";

import { DEFAULT_DARK_TREND_FEATURES } from ".";

export const DARK_TREND_ABOUT_FEATURES_KEY = "dark-trend.about.features-list";

/**
 * How many legacy `dark-trend.about.feature-N-header` / `-description` pairs
 * to read. The list field caps at 4 cards, and so did the old numbered keys.
 */
const LEGACY_FEATURE_SLOTS = 4;

/**
 * Rows built from the pre-list numbered keys
 * (`dark-trend.about.feature-N-header` / `feature-N-description`, retired
 * 2026-09-27 — see `RETIRED_TEMPLATE_KEYS`). Stores that saved those before
 * the `features-list` field existed keep their cards. A slot is kept when
 * either half is non-blank.
 */
function legacyFeatureRows(customFields: unknown): GenericTextRow[] {
  const rows: GenericTextRow[] = [];
  for (let n = 1; n <= LEGACY_FEATURE_SLOTS; n++) {
    const title =
      getRawCustomFieldString(
        customFields,
        `dark-trend.about.feature-${n}-header`,
      ) ?? "";
    const description =
      getRawCustomFieldString(
        customFields,
        `dark-trend.about.feature-${n}-description`,
      ) ?? "";
    if (title.trim() || description.trim()) {
      rows.push({ title, description });
    }
  }
  return rows;
}

/**
 * Resolves the about page's numbered cards:
 *   1. a saved `features-list` (any array) wins — parsed as today, so a saved
 *      empty or all-invalid list still falls back to the built-in cards;
 *   2. otherwise the legacy numbered `feature-N-*` keys, when any are set;
 *   3. otherwise the neutral built-in cards.
 */
export function resolveDarkTrendAboutFeatures(
  customFields: unknown,
): GenericTextRow[] {
  const saved = getListFieldValue(customFields, DARK_TREND_ABOUT_FEATURES_KEY);
  if (saved) {
    return (
      parseTemplateTextListRows(saved, DEFAULT_DARK_TREND_FEATURES) ??
      DEFAULT_DARK_TREND_FEATURES
    );
  }

  const legacy = legacyFeatureRows(customFields);
  return legacy.length > 0 ? legacy : DEFAULT_DARK_TREND_FEATURES;
}
