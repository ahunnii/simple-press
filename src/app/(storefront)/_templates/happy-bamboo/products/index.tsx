import type { LucideIcon } from "lucide-react";
import { Droplets, Leaf, Shield, Sparkles } from "lucide-react";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

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
