import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Droplets,
  Feather,
  Globe,
  Heart,
  Leaf,
  Recycle,
  Shield,
  ShieldCheck,
  Sparkles,
  TreeDeciduous,
  TreePine,
  Truck,
  Wind,
} from "lucide-react";

/** Curated icons available in template list fields (admin + storefront). */
export const TEMPLATE_LUCIDE_ICON_NAMES = [
  "TreePine",
  "Recycle",
  "Wind",
  "Shield",
  "Droplets",
  "Feather",
  "Leaf",
  "Heart",
  "Globe",
  "Sparkles",
  "TreeDeciduous",
  "ShieldCheck",
  "Truck",
  "Building2",
] as const;

export type LucideTemplateIconName =
  (typeof TEMPLATE_LUCIDE_ICON_NAMES)[number];

const iconMap: Record<LucideTemplateIconName, LucideIcon> = {
  TreePine,
  Recycle,
  Wind,
  Shield,
  Droplets,
  Feather,
  Leaf,
  Heart,
  Globe,
  Sparkles,
  TreeDeciduous,
  ShieldCheck,
  Truck,
  Building2,
};

export function getLucideTemplateIcon(name: string): LucideIcon | null {
  if (name in iconMap) {
    return iconMap[name as LucideTemplateIconName];
  }
  return null;
}
