import type { LucideIcon } from "lucide-react";
import { Droplets, Leaf, Shield, Sparkles } from "lucide-react";

import type { TemplateField, TemplateFieldGroup } from "~/lib/template-fields";
import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

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

const DEFAULT_LUCIDE_ICONS_WITH_LABELS = [
  { icon: Leaf, label: "100% Tree-Free" },
  { icon: Droplets, label: "Septic Safe" },
  { icon: Shield, label: "Hypoallergenic" },
  { icon: Sparkles, label: "Premium Quality" },
];

export function buildLucideIconsWithLabels(additional: {
  productFeatures?: Array<{ icon: string; text: string }>;
}): Array<{ Icon: LucideIcon; label: string }> {
  const features = additional?.productFeatures ?? [];
  const fromDb = features
    .map((f) => {
      const Icon = getLucideTemplateIcon(f.icon);
      if (!Icon || !f.text?.trim()) return null;
      return { Icon, label: f.text.trim() };
    })
    .filter((b): b is { Icon: LucideIcon; label: string } => b !== null);
  if (fromDb.length > 0) return fromDb;
  return DEFAULT_LUCIDE_ICONS_WITH_LABELS.map((b) => ({
    Icon: b.icon,
    label: b.label,
  }));
}
