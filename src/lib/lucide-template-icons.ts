import type { LucideIcon } from "lucide-react";
import {
  BanknoteArrowDown,
  Building2,
  CheckCircle,
  Droplets,
  Feather,
  Flower2,
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
  "Flower2",
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
  Flower2,
};

export function getLucideTemplateIcon(name: string): LucideIcon | null {
  if (name in iconMap) {
    return iconMap[name as LucideTemplateIconName];
  }
  return null;
}

export function buildLucideIconsWithLabels(
  additional: {
    productFeatures?: Array<{ icon: string; text: string }>;
  },
  defaultArray?: Array<{ icon: LucideIcon; label: string }>,
): Array<{ Icon: LucideIcon; label: string }> {
  const features = additional?.productFeatures ?? [];
  const fromDb = features
    .map((f) => {
      const Icon = getLucideTemplateIcon(f.icon);
      if (!Icon || !f.text?.trim()) return null;
      return { Icon, label: f.text.trim() };
    })
    .filter((b): b is { Icon: LucideIcon; label: string } => b !== null);
  if (fromDb.length > 0) return fromDb;
  if (!defaultArray) return [];
  return defaultArray.map((b) => ({
    Icon: b.icon,
    label: b.label,
  }));
}
