import type { LucideIcon } from "lucide-react";
import {
  BanknoteArrowDown,
  Building2,
  CheckCircle,
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
  Users,
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
  "CheckCircle",
  "BanknoteArrowDown",
  "Users",
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
  CheckCircle,
  BanknoteArrowDown,
  Users,
};

export function getLucideTemplateIcon(name: string): LucideIcon | null {
  if (name in iconMap) {
    return iconMap[name as LucideTemplateIconName];
  }
  return null;
}
