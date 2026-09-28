import type { TemplateField } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { dreamAboutData, dreamAboutFieldGroups } from "./about";
import { dreamAccountData, dreamAccountFieldGroups } from "./account";
import { dreamBlogData, dreamBlogFieldGroups } from "./blog";
import {
  dreamCartCheckoutData,
  dreamCartCheckoutFieldGroups,
} from "./cart-checkout";
import {
  dreamCheckoutUnavailableData,
  dreamCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  dreamCollectionsData,
  dreamCollectionsFieldGroups,
} from "./collections";
import { dreamContactData, dreamContactFieldGroups } from "./contact";
import { dreamDonateData, dreamDonateFieldGroups } from "./donate";
import { dreamEventsData, dreamEventsFieldGroups } from "./events";
import { dreamFaqData, dreamFaqFieldGroups } from "./faq";
import { dreamGlobalData, dreamGlobalFieldGroups } from "./global";
import { dreamHomepageData, dreamHomepageFieldGroups } from "./homepage";
import { dreamProductData, dreamProductFieldGroups } from "./products";
import { dreamServicesData, dreamServicesFieldGroups } from "./services";
import { dreamShopData, dreamShopFieldGroups } from "./shop";
import {
  dreamTestimonialsData,
  dreamTestimonialsFieldGroups,
} from "./testimonials";
import { dreamVideosData, dreamVideosFieldGroups } from "./videos";

// ─── Exports ──────────────────────────────────────────────────────────────────

export const dreamData = {
  dream: [
    ...dreamHomepageData,
    ...dreamAboutData,
    ...dreamServicesData,
    ...dreamContactData,
    ...dreamTestimonialsData,
    ...dreamProductData,
    ...dreamShopData,
    ...dreamCartCheckoutData,
    ...dreamCheckoutUnavailableData,
    ...dreamGlobalData,
    ...dreamAccountData,
    ...dreamCollectionsData,
    ...dreamBlogData,
    ...dreamEventsData,
    ...dreamVideosData,
    ...dreamDonateData,
    ...dreamFaqData,
  ],
};

export const dreamFieldGroups = {
  dream: [
    ...dreamHomepageFieldGroups,
    ...dreamAboutFieldGroups,
    ...dreamServicesFieldGroups,
    ...dreamContactFieldGroups,
    ...dreamTestimonialsFieldGroups,
    ...dreamProductFieldGroups,
    ...dreamShopFieldGroups,
    ...dreamCartCheckoutFieldGroups,
    ...dreamCheckoutUnavailableFieldGroups,
    ...dreamGlobalFieldGroups,
    ...dreamAccountFieldGroups,
    ...dreamCollectionsFieldGroups,
    ...dreamBlogFieldGroups,
    ...dreamEventsFieldGroups,
    ...dreamVideosFieldGroups,
    ...dreamDonateFieldGroups,
    ...dreamFaqFieldGroups,
  ],
};

const _dreamFieldMap = new Map<string, TemplateField>(
  dreamData.dream.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _dreamFieldMap);
}
