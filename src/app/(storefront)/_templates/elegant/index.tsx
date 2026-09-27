import { Droplets, Flower2, Leaf, Sparkles } from "lucide-react";

import type { TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { elegantAboutData, elegantAboutFieldGroups } from "./about";
import { elegantBlogData, elegantBlogFieldGroups } from "./blog";
import {
  elegantCartData,
  elegantCartFieldGroups,
} from "./cart-checkout/cart-fields";
import {
  elegantOrderData,
  elegantOrderFieldGroups,
} from "./cart-checkout/order-fields";
import {
  elegantCheckoutUnavailableData,
  elegantCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  elegantCollectionsData,
  elegantCollectionsFieldGroups,
} from "./collections";
import { elegantContactData, elegantContactFieldGroups } from "./contact";
import {
  elegantHomepageAboutData,
  elegantHomepageCtaData,
  elegantHomepageFeaturesData,
  elegantHomepageFieldGroups,
  elegantHomepageHeroData,
  elegantHomepageNewsletterData,
  elegantHomepageProductsData,
  elegantHomepageTestimonialsData,
  elegantHomepageTrustBadgesData,
} from "./homepage";
import { elegantLayoutData, elegantLayoutFieldGroups } from "./layout";
import { elegantProductData, elegantProductFieldGroups } from "./products";
import { elegantShopData, elegantShopFieldGroups } from "./shop";
import {
  elegantTestimonialsData,
  elegantTestimonialsFieldGroups,
} from "./testimonials";

export const DEFAULT_ELEGANT_TRUST_BADGES = [
  {
    icon: Leaf,
    title: "Quality Assured",
    description: "Carefully selected materials",
  },
  {
    icon: Droplets,
    title: "Thoughtfully Made",
    description: "Crafted with attention to detail",
  },
  {
    icon: Sparkles,
    title: "Trusted Quality",
    description: "Consistently high standards",
  },
  {
    icon: Flower2,
    title: "Customer Favorite",
    description: "Loved by our customers",
  },
];

export const DEFAULT_ELEGANT_ABOUT_FEATURES = [
  {
    icon: Leaf,
    title: "Eco-Friendly Packaging",
    description: "Recyclable and biodegradable materials",
  },
  {
    icon: Droplets,
    title: "Quality Craftsmanship",
    description: "Made with attention to every detail",
  },
  {
    icon: Sparkles,
    title: "Trusted Standards",
    description: "Consistently high quality",
  },
  {
    icon: Flower2,
    title: "Customer Favorite",
    description: "Loved by shoppers everywhere",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  ...elegantHomepageFieldGroups,
  ...elegantBlogFieldGroups,
  ...elegantContactFieldGroups,
  ...elegantAboutFieldGroups,
  ...elegantLayoutFieldGroups,
  ...elegantTestimonialsFieldGroups,
  ...elegantProductFieldGroups,
  ...elegantCheckoutUnavailableFieldGroups,
  ...elegantOrderFieldGroups,
  ...elegantCartFieldGroups,
  ...elegantShopFieldGroups,
  ...elegantCollectionsFieldGroups,
];

export const elegantData = {
  elegant: [
    ...elegantHomepageHeroData,
    ...elegantHomepageProductsData,
    ...elegantHomepageAboutData,
    ...elegantHomepageFeaturesData,
    ...elegantHomepageCtaData,
    ...elegantBlogData,
    ...elegantContactData,
    ...elegantAboutData,
    ...elegantHomepageTrustBadgesData,
    ...elegantLayoutData,
    ...elegantHomepageTestimonialsData,
    ...elegantHomepageNewsletterData,
    ...elegantTestimonialsData,
    ...elegantProductData,
    ...elegantCheckoutUnavailableData,
    ...elegantOrderData,
    ...elegantCartData,
    ...elegantShopData,
    ...elegantCollectionsData,
  ],
};

export const elegantFieldGroups = {
  elegant: fieldGroups,
};

const _elegantFieldMap = new Map(
  elegantData.elegant.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _elegantFieldMap);
}
