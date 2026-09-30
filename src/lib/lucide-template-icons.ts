import type { LucideIcon } from "lucide-react";
import {
  BanknoteArrowDown,
  BookOpen,
  Building2,
  CheckCircle,
  Droplets,
  Feather,
  FlaskConical,
  Flower2,
  Globe,
  HandHelping,
  Heart,
  Leaf,
  Map as MapIcon,
  Recycle,
  Shield,
  ShieldCheck,
  Sparkles,
  Sprout,
  TreeDeciduous,
  TreePine,
  Truck,
  Users,
  Wind,
} from "lucide-react";

import type { GenericIconRow, GenericImageRow } from "~/lib/template-fields";

/** Curated icons available in template list fields (admin + storefront). */
export const TEMPLATE_LUCIDE_ICON_NAMES = [
  "TreePine",
  "Recycle",
  "Wind",
  "Shield",
  "Droplets",
  "Feather",
  "Leaf",
  "Heart",
  "Globe",
  "Sparkles",
  "TreeDeciduous",
  "ShieldCheck",
  "Truck",
  "Building2",
  "CheckCircle",
  "BanknoteArrowDown",
  "Users",
  "Flower2",
  "FlaskConical",
  "Sprout",
  "HandHelping",
  "Map",
  "BookOpen",
] as const;

export type LucideTemplateIconName =
  (typeof TEMPLATE_LUCIDE_ICON_NAMES)[number];

const iconMap: Record<LucideTemplateIconName, LucideIcon> = {
  TreePine,
  Recycle,
  Wind,
  Shield,
  Droplets,
  Feather,
  Leaf,
  Heart,
  Globe,
  Sparkles,
  TreeDeciduous,
  ShieldCheck,
  Truck,
  Building2,
  CheckCircle,
  BanknoteArrowDown,
  Users,
  Flower2,
  FlaskConical,
  Sprout,
  HandHelping,
  Map: MapIcon,
  BookOpen,
};

export function getLucideTemplateIcon(name: string): LucideIcon | null {
  if (Object.prototype.hasOwnProperty.call(iconMap, name)) {
    return iconMap[name as LucideTemplateIconName];
  }
  return null;
}

/**
 * Maps a template field's `defaultRows` (as stored/edited — icons by name,
 * every sub-field key spelled out) into the resolved `GenericIconRow[]` shape
 * the storefront renders. Mirrors `parseTemplateIconListRows`'s icon
 * resolution (`getLucideTemplateIcon(...) ?? Leaf`) and per-key fallbacks, but
 * skips zod validation since `defaultRows` is authored in code, not user
 * input. Returns `[]` for `undefined`.
 *
 * Lives here (not in `~/lib/template-fields`, which re-exports it) so that a
 * template's field-definition module (e.g. `_templates/bamboo/about/index.tsx`)
 * can import it without pulling in `template-fields.ts`'s aggregate import of
 * every template's root `index.ts` — that would be a circular import back
 * into the very module doing the importing.
 */
export function iconRowsFromDefaults(
  rows?: readonly Record<string, string>[],
): GenericIconRow[] {
  if (!rows) return [];
  return rows.map((row) => ({
    icon: getLucideTemplateIcon(row.icon ?? "") ?? Leaf,
    title: row.title ?? "",
    description: row.description ?? "",
  }));
}

/**
 * Maps a template field's `defaultRows` (plain text/image rows, no icon) into
 * the `TemplateListRow[]` shape a `list` field's render expects, stamping a
 * stable `_id` onto each row (`${idPrefix}-${i + 1}`). The render keys list
 * items off `_id`, so it must stay stable across re-renders even though these
 * defaults are only ever read, never persisted, until the owner's first edit
 * copies them into the saved value.
 *
 * Lives here (not in `~/lib/template-fields`, which re-exports it) for the
 * same reason as `iconRowsFromDefaults` above: a template's field-definition
 * module (e.g. `_templates/vii/about/index.tsx`) needs to call this while
 * building its `defaultRows`, but importing it from `~/lib/template-fields`
 * there would be a circular import back into the very module doing the
 * importing.
 */
export function listRowsFromDefaults(
  rows: readonly Record<string, string>[],
  idPrefix: string,
): (Record<string, string> & { _id: string })[] {
  return rows.map((row, i) => ({ _id: `${idPrefix}-${i + 1}`, ...row }));
}

/**
 * Maps a template field's `defaultRows` (plain image/label rows, no icon)
 * into the `GenericImageRow[]` shape a `list` field's render expects. Mirrors
 * `parseTemplateImageListRows`'s per-key fallbacks, but skips zod validation
 * since `defaultRows` is authored in code, not user input. `description` is
 * included only when the row itself has that key, so a row with no
 * `description` sub-field produces an object with no `description` key at
 * all — matching callers (e.g. pollen's gallery) whose `itemSchema` has no
 * `description` sub-field and whose storefront output must stay
 * key-for-key identical to the pre-`defaultRows` hardcoded constant.
 *
 * Lives here (not in `~/lib/template-fields`, which re-exports
 * `iconRowsFromDefaults`) for the same reason as `iconRowsFromDefaults`
 * above: a template's field-definition module needs to call this while
 * building its `defaultRows`, but importing it from `~/lib/template-fields`
 * there would be a circular import back into the very module doing the
 * importing.
 */
export function imageRowsFromDefaults(
  rows?: readonly Record<string, string>[],
): GenericImageRow[] {
  if (!rows) return [];
  return rows.map((row) => ({
    image: row.image ?? "",
    label: row.label ?? "",
    ...("description" in row ? { description: row.description } : {}),
  }));
}

export function buildLucideIconsWithLabels(
  additional: {
    productFeatures?: Array<{ icon: string; text: string }>;
  },
  defaultArray?: Array<{ icon: LucideIcon; label: string }>,
): Array<{ Icon: LucideIcon; label: string }> {
  const features = additional?.productFeatures ?? [];
  const fromDb = features
    .map((f) => {
      const Icon = getLucideTemplateIcon(f.icon);
      if (!Icon || !f.text?.trim()) return null;
      return { Icon, label: f.text.trim() };
    })
    .filter((b): b is { Icon: LucideIcon; label: string } => b !== null);
  if (fromDb.length > 0) return fromDb;
  if (!defaultArray) return [];
  return defaultArray.map((b) => ({
    Icon: b.icon,
    label: b.label,
  }));
}
