import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { aboutBambooData, bambooAboutFieldGroups } from "./about";
import { bambooBlogData, bambooBlogFieldGroups } from "./blog";
import {
  bambooCheckoutSuccessData,
  bambooCheckoutSuccessFieldGroups,
} from "./cart-checkout";
import {
  bambooCheckoutUnavailableData,
  bambooCheckoutUnavailableFieldGroups,
} from "./cart-checkout/unavailable-fields";
import {
  bambooCollectionsData,
  bambooCollectionsFieldGroups,
} from "./collections";
import { bambooContactData, bambooContactFieldGroups } from "./contact";
import { bambooHomepageFieldGroups, homepageBambooData } from "./homepage";
import { bambooProductFieldGroups, bambooProductFields } from "./products";
import { bambooProductsData, bambooProductsFieldGroups } from "./shop";
import {
  bambooTestimonialsData,
  bambooTestimonialsFieldGroups,
} from "./testimonials";

const globalBrandingData: TemplateField[] = [
  {
    key: "bamboo.global.footer-note",
    label: "Footer bottom-bar note",
    description:
      'Short line beside the copyright at the very bottom of every page, e.g. "Proudly made in Detroit". Leave blank to hide. The longer blurb in the footer\'s first column comes from Content → Branding → Footer tagline.',
    type: "text",
    page: "global",
    group: "global.branding",
    defaultValue: "Proudly made in Detroit",
    placeholder: "Proudly made in Detroit",
  },
  {
    key: "bamboo.global.nav-wordmark",
    label: "Navigation wordmark",
    description:
      "Optional horizontal logo shown in the navigation bar once the page is scrolled (and, on phones, in the top bar in place of the round logo and business name). Use a light or transparent version — it sits on a dark bar. Leave blank to keep the round logo and name.",
    type: "image",
    page: "global",
    group: "global.branding",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
  {
    key: "bamboo.global.menu-tagline",
    label: "Menu tagline",
    description:
      "Short line at the bottom of the phone menu. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.branding",
    defaultValue: "",
    placeholder: "A short line about your business",
  },
];

const globalCartData: TemplateField[] = [
  {
    key: "bamboo.global.cart-label",
    label: "Cart panel label",
    description:
      "Small label above the item count at the top of the cart panel that slides out from the side. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    defaultValue: "Your cart",
    placeholder: "Your cart",
  },
  {
    key: "bamboo.global.cart-empty-text",
    label: "Empty cart message",
    description:
      "Line shown under \"Your cart is empty\" in the cart panel. Leave blank to hide.",
    type: "text",
    page: "global",
    group: "global.cart",
    defaultValue: "Add something you love to get started.",
    placeholder: "Add something you love to get started.",
  },
];

const globalAuthenticationData: TemplateField[] = [
  {
    key: "bamboo.global.authentication-image",
    label: "Sign-in background image",
    description: "Image shown behind the sign-in and sign-up panel.",
    type: "image",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
  {
    key: "bamboo.global.logo-size-width",
    label: "Logo width (px)",
    description: "Width of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
  {
    key: "bamboo.global.logo-size-height",
    label: "Logo height (px)",
    description: "Height of the logo on the sign-in and sign-up screens.",
    type: "number",
    page: "global",
    group: "global.authentication",
    gridColumn: "col-span-1",
    defaultValue: "80",
    placeholder: "80",
    min: 24,
    max: 400,
    unit: "px",
  },
];

const globalPageHeroData: TemplateField[] = [
  {
    key: "bamboo.global.page-hero-bg-image",
    label: "Page background photo",
    description:
      "Optional full-bleed background photo behind the top section of contact, blog, about, and other custom pages, under a translucent overlay. Leave blank for the flat look. Contact, blog, and about can each set their own photo instead, below their own hero fields.",
    type: "image",
    page: "global",
    group: "global.pageHero",
    gridColumn: "col-span-full",
    defaultValue: "",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.branding",
    title: "Logo, menu & footer text",
    description:
      "Navigation wordmark, the tagline at the bottom of the phone menu, and the short note in the footer's bottom bar.",
    icon: "🖋️",
  },
  {
    id: "global.cart",
    title: "Cart",
    description:
      "Wording inside the cart panel that slides out from the side.",
    icon: "🛒",
  },
  {
    id: "global.authentication",
    title: "Sign-in screens",
    description:
      "Background image and logo size on the sign-in and sign-up screens.",
    icon: "🔐",
    columns: 2,
  },
  {
    id: "global.pageHero",
    title: "Page background photo",
    description:
      "Site-wide background photo for the top section of secondary pages (contact, blog, about, and other custom pages). Contact, blog, and about can each use their own photo instead.",
    icon: "🖼️",
  },
  ...bambooHomepageFieldGroups,
  ...bambooAboutFieldGroups,
  ...bambooBlogFieldGroups,
  ...bambooContactFieldGroups,
  ...bambooTestimonialsFieldGroups,
  ...bambooCollectionsFieldGroups,
  ...bambooProductsFieldGroups,
  ...bambooProductFieldGroups,
  ...bambooCheckoutSuccessFieldGroups,
  ...bambooCheckoutUnavailableFieldGroups,
];

export const bambooData = {
  bamboo: [
    ...homepageBambooData,
    ...aboutBambooData,
    ...bambooContactData,
    ...bambooBlogData,
    ...bambooTestimonialsData,
    ...bambooCollectionsData,
    ...bambooProductsData,
    ...bambooProductFields,
    ...bambooCheckoutSuccessData,
    ...bambooCheckoutUnavailableData,
    ...globalBrandingData,
    ...globalCartData,
    ...globalAuthenticationData,
    ...globalPageHeroData,
  ],
};

export const bambooFieldGroups = {
  bamboo: fieldGroups,
};

const _bambooFieldMap = new Map(
  bambooData.bamboo.map((field) => [field.key, field]),
);

export function resolveFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  return resolveTemplateFields(customFields, keys, _bambooFieldMap);
}
