import { Droplets, Leaf, Shield, Sparkles } from "lucide-react";

import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";

const productsPageData: TemplateField[] = [
  {
    key: "bamboo.products.listing-title",
    label: "Products listing title",
    description: "Main heading on the products index page",
    type: "text",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-full",
    defaultValue: "Our Products",
    placeholder: "Our Products",
  },
  {
    key: "bamboo.products.listing-intro",
    label: "Products listing intro",
    description: "Short intro below the products listing title",
    type: "textarea",
    page: "products",
    group: "products.listing",
    gridColumn: "col-span-full",
    defaultValue: "Explore our collection of premium bamboo products.",
    placeholder: "Explore our collection of premium bamboo products.",
  },
];

export const bambooProductsData = [...productsPageData];

export const bambooProductsFieldGroups: TemplateFieldGroup[] = [
  {
    id: "products.listing",
    title: "Products Listing Hero",
    description: "Products index page hero (title, intro, image)",
    icon: "📝",
    columns: 2,
  },
];

/////

export const DEFAULT_LUCIDE_ICONS_WITH_LABELS = [
  { icon: Leaf, label: "100% Tree-Free" },
  { icon: Droplets, label: "Septic Safe" },
  { icon: Shield, label: "Hypoallergenic" },
  { icon: Sparkles, label: "Premium Quality" },
];
