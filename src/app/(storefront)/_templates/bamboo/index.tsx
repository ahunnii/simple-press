import {
  Building2,
  Droplets,
  Heart,
  Leaf,
  ShieldCheck,
  Sprout,
  TreePine,
  Truck,
  Users,
} from "lucide-react";

import type {
  GenericIconRow,
  TemplateField,
  TemplateFieldGroup,
} from "~/lib/template-fields";
import { resolveTemplateFields } from "~/lib/resolve-template-fields";

import { aboutBambooData, bambooAboutFieldGroups } from "./about";
import { bambooBlogData, bambooBlogFieldGroups } from "./blog";
import {
  bambooCollectionsData,
  bambooCollectionsFieldGroups,
} from "./collections";
import { bambooContactData, bambooContactFieldGroups } from "./contact";
import { bambooHomepageFieldGroups, homepageBambooData } from "./homepage";
import { bambooProductsData, bambooProductsFieldGroups } from "./products";
import {
  bambooTestimonialsData,
  bambooTestimonialsFieldGroups,
} from "./testimonials";

const globalLocationData: TemplateField[] = [
  {
    key: "bamboo.global.location-map",
    label: "Global Location Map",
    description: "Map image for the global location section",
    type: "image",
    page: "global",
    group: "global.location",
    gridColumn: "col-span-full",
    defaultValue: "/placeholder.svg",
  },
];

const fieldGroups: TemplateFieldGroup[] = [
  {
    id: "global.location",
    title: "Global Location Section",
    description: "Global location section on the homepage",
    icon: "🗺️",
    columns: 2,
  },
  ...bambooHomepageFieldGroups,
  ...bambooAboutFieldGroups,
  ...bambooBlogFieldGroups,
  ...bambooContactFieldGroups,
  ...bambooTestimonialsFieldGroups,
  ...bambooCollectionsFieldGroups,
  ...bambooProductsFieldGroups,
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
    ...globalLocationData,
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

export const DEFAULT_BAMBOO_VALUES: GenericIconRow[] = [
  {
    icon: Leaf,
    title: "Sustainability First",
    description:
      "Every decision we make starts with the planet. From sourcing to packaging, we choose the path that leaves the smallest footprint.",
  },
  {
    icon: Heart,
    title: "Premium Quality",
    description:
      "We refuse to compromise. Our bamboo products match or exceed the softness and strength of traditional premium brands.",
  },
  {
    icon: Users,
    title: "Community Driven",
    description:
      "We believe in the power of community. We are always here to help you find the perfect product for your needs.",
  },
];
export const DEFAULT_BAMBOO_NATIONWIDE_FACTS: GenericIconRow[] = [
  {
    icon: Truck,
    title: "Nationwide Shipping",
    description:
      "We deliver our premium products to doorsteps across the country, carefully packaged and always on time.",
  },
  {
    icon: Building2,
    title: "Homes & Businesses",
    description:
      "From your bathroom to bustling restaurants, hotels, schools, and local stores -- we have solutions for every setting.",
  },
  {
    icon: ShieldCheck,
    title: "Customer-First Service",
    description:
      "Our dedicated Detroit-based team provides responsive, knowledgeable support for every order and inquiry.",
  },
];
export const DEFAULT_BAMBOO_WHY_BAMBOO_FACTS: GenericIconRow[] = [
  {
    icon: Sprout,
    title: "Rapid Growth",
    description:
      "Bamboo grows up to 35 inches per day and reaches maturity in 3-5 years, compared to 20-50 years for hardwood trees.",
  },
  {
    icon: TreePine,
    title: "No Replanting Needed",
    description:
      "Bamboo regenerates from its own root system after harvest, which means the soil stays intact and carbon continues to be sequestered.",
  },
  {
    icon: Droplets,
    title: "Water Efficient",
    description:
      "Bamboo requires significantly less water than traditional tree farming and thrives without pesticides or fertilizers.",
  },
];
