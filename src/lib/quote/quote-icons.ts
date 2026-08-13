import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  Bed,
  BedDouble,
  Box,
  Boxes,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Car,
  Cat,
  Clock,
  Dog,
  DollarSign,
  Home,
  MapPin,
  Package,
  Ruler,
  Sofa,
  Star,
  Store,
  Truck,
  User,
  Users,
  Warehouse,
  Armchair,
} from "lucide-react";

/** Curated icons available in quote calculator choice cards. */
export const QUOTE_ICON_NAMES = [
  "Home",
  "Building2",
  "Building",
  "Warehouse",
  "Truck",
  "Package",
  "Boxes",
  "Box",
  "BedDouble",
  "Bed",
  "Sofa",
  "Armchair",
  "Car",
  "MapPin",
  "Calendar",
  "Clock",
  "Users",
  "User",
  "Star",
  "DollarSign",
  "Ruler",
  "Dog",
  "Cat",
  "Briefcase",
  "ArrowUpDown",
  "Store",
] as const;

export type QuoteIconName = (typeof QUOTE_ICON_NAMES)[number];

const iconMap: Record<QuoteIconName, LucideIcon> = {
  Home,
  Building2,
  Building,
  Warehouse,
  Truck,
  Package,
  Boxes,
  Box,
  BedDouble,
  Bed,
  Sofa,
  Armchair,
  Car,
  MapPin,
  Calendar,
  Clock,
  Users,
  User,
  Star,
  DollarSign,
  Ruler,
  Dog,
  Cat,
  Briefcase,
  ArrowUpDown,
  Store,
};

export function getQuoteIcon(name: string): LucideIcon | null {
  if (name in iconMap) {
    return iconMap[name as QuoteIconName];
  }
  return null;
}
