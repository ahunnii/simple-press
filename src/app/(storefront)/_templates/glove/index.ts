import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { gloveAboutData, gloveAboutFieldGroups } from "./about";
import { gloveAccountData, gloveAccountFieldGroups } from "./account";
import { gloveBlogData, gloveBlogFieldGroups } from "./blog";
import {
  gloveCartData,
  gloveCartFieldGroups,
  gloveCheckoutData,
  gloveCheckoutFieldGroups,
  gloveOrderData,
  gloveOrderFieldGroups,
} from "./cart-checkout";
import {
  gloveCollectionsData,
  gloveCollectionsFieldGroups,
} from "./collections";
import { gloveContactData, gloveContactFieldGroups } from "./contact";
import { gloveDonateData, gloveDonateFieldGroups } from "./donate";
import { gloveEventsData, gloveEventsFieldGroups } from "./events";
import { gloveFaqData, gloveFaqFieldGroups } from "./faq";
import { gloveHomepageData, gloveHomepageFieldGroups } from "./homepage";
import { gloveLayoutData, gloveLayoutFieldGroups } from "./layout";
import { gloveProductData, gloveProductFieldGroups } from "./products";
import { gloveShopData, gloveShopFieldGroups } from "./shop";
import {
  gloveTestimonialsData,
  gloveTestimonialsFieldGroups,
} from "./testimonials";
import { gloveVideosData, gloveVideosFieldGroups } from "./videos";

// ─── Global: Authentication ───────────────────────────────────────────────

const globalAuthenticationData: TemplateField[] = [
  {
    key: "glove.global.authentication-image",
    label: "Sign-in image",
    description: "Image shown beside the sign-in and sign-up forms.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/templates/glove/images/hero.jpg",
  },
];

// ─── Exports ──────────────────────────────────────────────────────────────

export const gloveData = {
  glove: [
    ...gloveHomepageData,
    ...gloveShopData,
    ...gloveProductData,
    ...gloveCollectionsData,
    ...gloveAboutData,
    ...gloveContactData,
    ...gloveTestimonialsData,
    ...gloveBlogData,
    ...gloveCartData,
    ...gloveCheckoutData,
    ...gloveOrderData,
    ...gloveAccountData,
    ...gloveLayoutData,
    ...globalAuthenticationData,
    // Optional pages (events, videos, donate, FAQ) reuse Default's `default.*`
    // copy fields verbatim — glove's pages read them through Default's
    // resolver, so declaring them here exposes them in glove's editor.
    ...gloveEventsData,
    ...gloveVideosData,
    ...gloveDonateData,
    ...gloveFaqData,
  ],
};

export const gloveFieldGroups = {
  glove: [
    ...gloveHomepageFieldGroups,
    ...gloveShopFieldGroups,
    ...gloveProductFieldGroups,
    ...gloveCollectionsFieldGroups,
    ...gloveAboutFieldGroups,
    ...gloveContactFieldGroups,
    ...gloveTestimonialsFieldGroups,
    ...gloveBlogFieldGroups,
    ...gloveCartFieldGroups,
    ...gloveCheckoutFieldGroups,
    ...gloveOrderFieldGroups,
    ...gloveAccountFieldGroups,
    ...gloveEventsFieldGroups,
    ...gloveVideosFieldGroups,
    ...gloveDonateFieldGroups,
    ...gloveFaqFieldGroups,
    ...gloveLayoutFieldGroups,
    {
      id: "global.authentication",
      title: "Sign-in screens",
      description: "Image shown beside the sign-in and sign-up forms.",
      icon: "🔐",
      columns: 1,
    } satisfies TemplateFieldGroup,
  ],
};

const _gloveFieldMap = new Map(
  gloveData.glove.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _gloveFieldMap);
}
