import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { coopAboutData, coopAboutFieldGroups } from "./about";
import { coopContactData, coopContactFieldGroups } from "./contact";
import { coopGenericData, coopGenericFieldGroups } from "./generic";
import { coopHomepageData, coopHomepageFieldGroups } from "./homepage";

/**
 * Field/group registry for the `coop` template (Building Cooperatively —
 * pixel-exact replica, fixed brand, no theme presets).
 *
 * Aggregates the global/chrome fields defined below with every page domain's
 * field module (homepage, about, contact, generic gallery/CMS), mirroring
 * vii's `index.ts` aggregation pattern. Coop deliberately omits vii's
 * product/authentication global baselines: it is a no-commerce service
 * replica whose account/auth pages are default-template fallbacks that don't
 * read coop fields.
 */

// ─── Global: Branding (header gallery link + footer social links) ───────────

const globalBrandingData: TemplateField[] = [
  {
    key: "coop.global.header.galleryLabel",
    label: "Header Nav — Gallery Link Label",
    description:
      "Label for the header's third nav link, which points at the project gallery page.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Project Gallery Page",
  },
  {
    key: "coop.global.header.galleryHref",
    label: "Header Nav — Gallery Link URL",
    description:
      "URL the header's gallery nav link points to — the slug of your Project Gallery generic page.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "/project-gallery-page",
  },
  {
    key: "coop.global.footer.instagramLabel",
    label: "Footer — Instagram Link Label",
    description: "Text of the Instagram link in the footer.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Instagram",
  },
  {
    key: "coop.global.footer.instagramUrl",
    label: "Footer — Instagram URL",
    description: "URL the footer's Instagram link points to.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "https://www.instagram.com/buildingcooperatively",
  },
  {
    key: "coop.global.footer.facebookLabel",
    label: "Footer — Facebook Link Label",
    description: "Text of the Facebook link in the footer.",
    type: "text",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "Facebook",
  },
  {
    key: "coop.global.footer.facebookUrl",
    label: "Footer — Facebook URL",
    description:
      "URL the footer's Facebook link points to. Opens in a new tab.",
    type: "url",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-1",
    defaultValue: "https://www.facebook.com/Building.Cooperatively/",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────────

export const coopData = {
  coop: [
    ...coopHomepageData,
    ...coopAboutData,
    ...coopContactData,
    ...coopGenericData,
    ...globalBrandingData,
  ],
};

export const coopFieldGroups = {
  coop: [
    ...coopHomepageFieldGroups,
    ...coopAboutFieldGroups,
    ...coopContactFieldGroups,
    ...coopGenericFieldGroups,
    {
      id: "global.branding",
      title: "Global Branding",
      description:
        "Header gallery-nav link and footer Instagram/Facebook links, shown on every page",
      icon: "🏷️",
      columns: 2,
    } satisfies TemplateFieldGroup,
  ],
};

const _coopFieldMap = new Map(coopData.coop.map((field) => [field.key, field]));

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _coopFieldMap);
}
