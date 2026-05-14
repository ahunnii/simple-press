import type { LucideIcon } from "lucide-react";
import { Droplets, Leaf, Shield, Sparkles } from "lucide-react";

import { getLucideTemplateIcon } from "~/lib/lucide-template-icons";

export const DEFAULT_LUCIDE_ICONS_WITH_LABELS = [
  { icon: Leaf, label: "100% Tree-Free" },
  { icon: Droplets, label: "Septic Safe" },
  { icon: Shield, label: "Hypoallergenic" },
  { icon: Sparkles, label: "Premium Quality" },
];
