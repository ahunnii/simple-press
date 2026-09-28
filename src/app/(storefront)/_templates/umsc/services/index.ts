import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import {
  defaultServicesData,
  defaultServicesFieldGroups,
} from "../../default/services";

/**
 * Services index (`/services`) field registry for umsc — parity PF24
 * (package TP7, docs/templates/umsc/parity-plan-2026-09-28.md).
 *
 * umsc rendered Default's `DefaultServicesIndexPage` until 2026-09-28 (the
 * registry merges Default's slot in), so any saved copy lives under
 * `default.services.*`. The umsc page keeps reading those keys through
 * Default's resolver and declares them here verbatim (the pollen round-2
 * trap), minus the two eyebrow labels umsc never renders (design.md: no
 * eyebrow/kicker labels): `default.services.hero-eyebrow` and
 * `default.services.cta-eyebrow`. `default.services.hero-image` becomes the
 * band's right-side photo.
 *
 * The card link and the designed empty state are new `umsc.services.*`
 * keys (Default hard-coded "Explore →" and "No services yet."), read
 * through `resolveUmscServicesFields` (this module's own map) so defaults
 * behave the same before and after the root `index.ts` spreads them.
 *
 * The page component is NOT re-exported here (circular-import guard).
 */

export const UMSC_SERVICES_OMITTED_KEYS = new Set([
  "default.services.hero-eyebrow",
  "default.services.cta-eyebrow",
]);

const inheritedServicesData: TemplateField[] = defaultServicesData.filter(
  (field) => !UMSC_SERVICES_OMITTED_KEYS.has(field.key),
);

// ─── services.list — the service cards and their empty state ───────────────

const servicesListData: TemplateField[] = [
  {
    key: "umsc.services.card-link-label",
    label: "Card link text",
    description:
      "Small link under each service card. Leave blank to hide it (the whole card stays clickable).",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Explore",
    placeholder: "e.g. See details",
  },
  {
    key: "umsc.services.empty-heading",
    label: "Empty state heading",
    description: "Shown in place of the cards while no services are published.",
    type: "text",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-1",
    defaultValue: "Services are on their way.",
    placeholder: "e.g. Nothing booked yet",
  },
  {
    key: "umsc.services.empty-body",
    label: "Empty state message",
    description: "Line under the empty-state heading. Leave blank to hide.",
    type: "textarea",
    page: "services",
    group: "services.list",
    gridColumn: "col-span-full",
    defaultValue:
      "Ask Monique about custom batches, gifts, and favors in the meantime.",
    placeholder: "One short sentence",
  },
];

// ─── Exports ────────────────────────────────────────────────────────────────

export const umscServicesData: TemplateField[] = [
  ...inheritedServicesData,
  ...servicesListData,
];

export const umscServicesFieldGroups: TemplateFieldGroup[] = [
  // `services.hero` ("Hero"), `services.intro` ("Intro") and `services.cta`
  // ("Closing banner") verbatim, then umsc's list group.
  ...defaultServicesFieldGroups,
  {
    id: "services.list",
    title: "Services",
    description:
      "Link text under each service card and the empty state shown while no services are published.",
    icon: "🕯️",
    columns: 2,
  },
];

export const umscServicesSections: TemplateSection[] = [
  {
    id: "services.hero",
    page: "services",
    title: "Hero",
    description: "Page heading, intro text and optional photo",
    groupIds: ["services.hero"],
    order: 0,
    hideable: false,
  },
  {
    id: "services.intro",
    page: "services",
    title: "Intro",
    description: "Optional intro above the service cards",
    groupIds: ["services.intro"],
    order: 1,
    hideable: true,
  },
  {
    id: "services.list",
    page: "services",
    title: "Services",
    description: "A card for every published service, or the empty state",
    groupIds: ["services.list"],
    order: 2,
    hideable: false,
  },
  {
    id: "services.cta",
    page: "services",
    title: "Closing banner",
    description: "Bottom banner inviting visitors to get in touch",
    groupIds: ["services.cta"],
    order: 3,
    hideable: true,
  },
];

const _servicesFieldMap = new Map(umscServicesData.map((f) => [f.key, f]));

/** `resolveFields` over the services index fields only (see header). */
export function resolveUmscServicesFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _servicesFieldMap);
}
