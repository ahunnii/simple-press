import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { pinkAboutData, pinkAboutFieldGroups } from "./about";
import { pinkAccountData, pinkAccountFieldGroups } from "./account";
import { pinkBlogData, pinkBlogFieldGroups } from "./blog";
import {
  pinkCartCheckoutData,
  pinkCartCheckoutFieldGroups,
} from "./cart-checkout";
import { pinkCollectionsData, pinkCollectionsFieldGroups } from "./collections";
import { pinkContactData, pinkContactFieldGroups } from "./contact";
import { pinkEventsData, pinkEventsFieldGroups } from "./events";
import { pinkGenericData, pinkGenericFieldGroups } from "./generic";
import { pinkHomepageData, pinkHomepageFieldGroups } from "./homepage";
import { pinkGlobalData, pinkGlobalFieldGroups } from "./layout";
import { pinkProductData, pinkProductFieldGroups } from "./products";
import { pinkServicesData, pinkServicesFieldGroups } from "./services";
import { pinkShopData, pinkShopFieldGroups } from "./shop";
import {
  pinkTestimonialsData,
  pinkTestimonialsFieldGroups,
} from "./testimonials";
import { pinkVideosData, pinkVideosFieldGroups } from "./videos";

/**
 * Root field registry for the `pink` template (PinkArt LLC).
 *
 * Aggregates every page domain's `Data` / `FieldGroups` exports plus the global
 * chrome fields from `./layout`. Registered in `src/lib/template-fields.ts`.
 *
 * `generic` and `account` intentionally export empty arrays:
 *   - the generic CMS page's chrome lives in `./layout` under `page: "global"`
 *     (the `TemplatePage` union has no `generic` member — same convention as coop);
 *   - account pages have no page key at all and render purely from session /
 *     tRPC data.
 *
 * Product-page fields also live under `page: "global"` (groups `global.product-*`),
 * following vii's convention — a product page is per-record, so it has no editor
 * tab of its own (`product` is absent from `PAGE_PREVIEW_PATHS`).
 *
 * Authority: docs/templates/pink/design.md
 */
export const pinkData: Record<string, TemplateField[]> = {
  pink: [
    ...pinkHomepageData,
    ...pinkAboutData,
    ...pinkShopData,
    ...pinkProductData,
    ...pinkCollectionsData,
    ...pinkServicesData,
    ...pinkEventsData,
    ...pinkVideosData,
    ...pinkBlogData,
    ...pinkTestimonialsData,
    ...pinkContactData,
    ...pinkCartCheckoutData,
    ...pinkGenericData,
    ...pinkAccountData,
    ...pinkGlobalData,
  ],
};

export const pinkFieldGroups: Record<string, TemplateFieldGroup[]> = {
  pink: [
    ...pinkHomepageFieldGroups,
    ...pinkAboutFieldGroups,
    ...pinkShopFieldGroups,
    ...pinkProductFieldGroups,
    ...pinkCollectionsFieldGroups,
    ...pinkServicesFieldGroups,
    ...pinkEventsFieldGroups,
    ...pinkVideosFieldGroups,
    ...pinkBlogFieldGroups,
    ...pinkTestimonialsFieldGroups,
    ...pinkContactFieldGroups,
    ...pinkCartCheckoutFieldGroups,
    ...pinkGenericFieldGroups,
    ...pinkAccountFieldGroups,
    ...pinkGlobalFieldGroups,
  ],
};

const _pinkFieldMap = new Map<string, TemplateField>(
  (pinkData.pink ?? []).map((f) => [f.key, f]),
);

/**
 * Merges owner-saved values from `Business.siteContent.customFields` with each
 * field's `defaultValue`. Pure and synchronous — safe to call from server or
 * client components.
 *
 * NOTE: `list` and `richtext` fields bypass this — read `customFields` directly
 * with `parseTemplateListRows` / `getRichTextFieldValue`. A list field's
 * `defaultValue` is therefore inert; presentable out-of-the-box rows live as
 * component-level fallback constants.
 */
export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _pinkFieldMap);
}
