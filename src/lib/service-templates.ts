/**
 * Service-template registry (parallel to src/lib/template-fields.ts).
 *
 * Exports field definitions, field-group metadata, and display metadata for
 * all service page templates — generic (global fallback) plus per-storefront
 * sets for pollen and vii.
 *
 * React components are NOT included here — they live in the storefront layer
 * and are wired up in each template's components.ts file. This module is
 * imported by the admin UI which must not pull in server components.
 */
import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { groupFieldsByGroup } from "~/lib/template-fields";
import {
  serviceOneFieldGroups,
  serviceOneFields,
} from "~/app/(storefront)/_templates/_service-pages/service-one";
import {
  serviceThreeFieldGroups,
  serviceThreeFields,
} from "~/app/(storefront)/_templates/_service-pages/service-three";
import {
  serviceTwoFieldGroups,
  serviceTwoFields,
} from "~/app/(storefront)/_templates/_service-pages/service-two";
import { buildersServiceTemplateDefs } from "~/app/(storefront)/_templates/builders/services/service-pages/fields";
import { pollenServiceTemplateDefs } from "~/app/(storefront)/_templates/pollen/services/service-pages/fields";
import { viiServiceTemplateDefs } from "~/app/(storefront)/_templates/vii/services/service-pages/fields";

// ─── Core type ───────────────────────────────────────────────────────────────

/**
 * A single service-page template definition. Contains everything needed to
 * drive the admin field editor and the storefront component resolver.
 *
 * Field key naming convention:
 *   "<def-id>.<field-slug>"
 *   e.g. "service-one.hero-image", "pollen-spa.intro-body"
 */
export type ServiceTemplateDef = {
  /** Globally-unique id used as the value stored on a Service record. */
  id: string;
  /** Short human-readable label shown in the admin template picker. */
  label: string;
  /** One-sentence description shown under the label in the picker. */
  description: string;
  /** Field definitions for the admin content editor. */
  fields: TemplateField[];
  /** Field-group metadata used to render grouped sections in the editor. */
  fieldGroups: TemplateFieldGroup[];
};

// ─── Legacy display-metadata type (kept for backward compat) ─────────────────

export type ServiceTemplateMeta = {
  id: string;
  label: string;
  description: string;
};

// ─── Generic (global fallback) defs ──────────────────────────────────────────

export const genericServiceTemplateDefs: ServiceTemplateDef[] = [
  {
    id: "service-one",
    label: "Minimal",
    description:
      "A clean, focused layout with a hero image, intro text, and a single call-to-action.",
    fields: serviceOneFields,
    fieldGroups: serviceOneFieldGroups,
  },
  {
    id: "service-two",
    label: "Media Rich",
    description:
      "A media-heavy layout with a hero video, photo gallery, and icon highlight cards.",
    fields: serviceTwoFields,
    fieldGroups: serviceTwoFieldGroups,
  },
  {
    id: "service-three",
    label: "Editorial",
    description:
      "An editorial layout with a hero image, long-form body text, secondary image, and a pull quote.",
    fields: serviceThreeFields,
    fieldGroups: serviceThreeFieldGroups,
  },
];

// ─── Per-storefront template sets ────────────────────────────────────────────

/**
 * Maps storefront templateId → the service-page templates available for that
 * storefront. When a storefront's array is empty (stubs not yet filled in),
 * `getServiceTemplatesForStorefront` falls back to `genericServiceTemplateDefs`.
 */
export const SERVICE_TEMPLATES_BY_STOREFRONT: Record<
  string,
  ServiceTemplateDef[]
> = {
  default: genericServiceTemplateDefs,
  builders: buildersServiceTemplateDefs,
  pollen: pollenServiceTemplateDefs,
  vii: viiServiceTemplateDefs,
};

// ─── Flat lookup map (id → def) ──────────────────────────────────────────────

/**
 * Flat map of every known service template def, keyed by def.id.
 * Used to look up fields/groups by serviceTemplateId regardless of which
 * storefront the def belongs to.
 */
export const SERVICE_TEMPLATE_DEFS: Record<string, ServiceTemplateDef> =
  Object.fromEntries(
    [
      ...genericServiceTemplateDefs,
      ...buildersServiceTemplateDefs,
      ...pollenServiceTemplateDefs,
      ...viiServiceTemplateDefs,
    ].map((def) => [def.id, def]),
  );

// ─── Derived legacy maps (kept so existing importers keep working) ────────────

export const SERVICE_TEMPLATE_FIELDS: Record<string, TemplateField[]> =
  Object.fromEntries(
    Object.entries(SERVICE_TEMPLATE_DEFS).map(([id, def]) => [id, def.fields]),
  );

export const SERVICE_TEMPLATE_FIELD_GROUPS: Record<
  string,
  TemplateFieldGroup[]
> = Object.fromEntries(
  Object.entries(SERVICE_TEMPLATE_DEFS).map(([id, def]) => [
    id,
    def.fieldGroups,
  ]),
);

export const SERVICE_TEMPLATE_META: Record<string, ServiceTemplateMeta> =
  Object.fromEntries(
    Object.entries(SERVICE_TEMPLATE_DEFS).map(([id, def]) => [
      id,
      { id: def.id, label: def.label, description: def.description },
    ]),
  );

// ─── Category-aware templates ─────────────────────────────────────────────────

/**
 * Service template ids that support section-based item grouping via the
 * `ServiceItem.category` field. The admin item editor renders a Section picker
 * only for these templates.
 */
export const CATEGORY_AWARE_SERVICE_TEMPLATES = new Set<string>([
  "vii-collection",
]);

export function isCategoryAwareServiceTemplate(id: string): boolean {
  return CATEGORY_AWARE_SERVICE_TEMPLATES.has(id);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns the service-page templates available for the given storefront
 * templateId. Falls back to `genericServiceTemplateDefs` when:
 *   - the storefront has no entry in SERVICE_TEMPLATES_BY_STOREFRONT, OR
 *   - the storefront's array is empty (stub not yet populated).
 */
export function getServiceTemplatesForStorefront(
  storefrontTemplateId: string,
): ServiceTemplateDef[] {
  const defs = SERVICE_TEMPLATES_BY_STOREFRONT[storefrontTemplateId];
  if (defs !== undefined && defs.length > 0) return defs;
  return genericServiceTemplateDefs;
}

/**
 * Returns the id of the first (default) service template for the given
 * storefront templateId.
 */
export function getDefaultServiceTemplateId(
  storefrontTemplateId: string,
): string {
  const defs = getServiceTemplatesForStorefront(storefrontTemplateId);
  // getServiceTemplatesForStorefront always returns genericServiceTemplateDefs
  // as fallback, which is non-empty, so this non-null assertion is safe.
  return defs[0]!.id;
}

/**
 * Returns the fields for the given service template id, grouped by their
 * `group` key. Groups without a `group` fall into `"ungrouped"`.
 *
 * Reuses `groupFieldsByGroup` from `template-fields.ts` which operates
 * directly on a field array (no global registry lookup needed).
 */
export function getServiceTemplateFieldsByGroup(
  serviceTemplateId: string,
): Record<string, TemplateField[]> {
  const def = SERVICE_TEMPLATE_DEFS[serviceTemplateId];
  const fields = def?.fields ?? [];
  return groupFieldsByGroup(fields);
}

/**
 * Returns the field groups for the given service template id.
 * Returns an empty array when the template id is unknown.
 */
export function getServiceTemplateFieldGroups(
  serviceTemplateId: string,
): TemplateFieldGroup[] {
  const def = SERVICE_TEMPLATE_DEFS[serviceTemplateId];
  return def?.fieldGroups ?? [];
}

/**
 * Returns display metadata for all registered service templates in a stable
 * order suitable for a template picker UI.
 *
 * @deprecated Prefer `getServiceTemplatesForStorefront(storefrontTemplateId)`
 * to get only the templates relevant to the current storefront.
 */
export function getAllServiceTemplateMetas(): ServiceTemplateMeta[] {
  return Object.values(SERVICE_TEMPLATE_META);
}
