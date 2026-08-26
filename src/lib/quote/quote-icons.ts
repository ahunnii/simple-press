import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  ArrowUpDown,
  Bed,
  BedDouble,
  Box,
  Boxes,
  Briefcase,
  Building,
  Building2,
  Calendar,
  CalendarClock,
  Car,
  Cat,
  ChevronsUp,
  Clock,
  Dog,
  DollarSign,
  DoorOpen,
  Forklift,
  Frame,
  Home,
  Hourglass,
  Layers,
  MapPin,
  MoveVertical,
  Package,
  PackageOpen,
  Piano,
  Refrigerator,
  Route,
  Ruler,
  Sofa,
  Star,
  Store,
  Truck,
  User,
  Users,
  Vault,
  Warehouse,
  WashingMachine,
  Weight,
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
  "PackageOpen",
  "BedDouble",
  "Bed",
  "Sofa",
  "Armchair",
  "Piano",
  "Refrigerator",
  "WashingMachine",
  "Vault",
  "Weight",
  "Frame",
  "ChevronsUp",
  "MoveVertical",
  "Layers",
  "DoorOpen",
  "Forklift",
  "Route",
  "MapPin",
  "Car",
  "Calendar",
  "CalendarClock",
  "Clock",
  "Hourglass",
  "Users",
  "User",
  "Briefcase",
  "DollarSign",
  "Ruler",
  "ArrowUpDown",
  "Dog",
  "Cat",
  "Star",
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
  PackageOpen,
  BedDouble,
  Bed,
  Sofa,
  Armchair,
  Piano,
  Refrigerator,
  WashingMachine,
  Vault,
  Weight,
  Frame,
  ChevronsUp,
  MoveVertical,
  Layers,
  DoorOpen,
  Forklift,
  Route,
  MapPin,
  Car,
  Calendar,
  CalendarClock,
  Clock,
  Hourglass,
  Users,
  User,
  Briefcase,
  DollarSign,
  Ruler,
  ArrowUpDown,
  Dog,
  Cat,
  Star,
  Store,
};

/**
 * Human-readable labels for quote icons, used in the picker UI.
 * Excluded from the picker are Dog, Cat, Star, and Store — these can still be
 * rendered in existing calculators to preserve saved icon selections, but new
 * picks must use moving-relevant icons instead.
 */
export const QUOTE_ICON_LABELS: Record<QuoteIconName, string> = {
  Home: "House",
  Building2: "Office building",
  Building: "Apartment building",
  Warehouse: "Storage / warehouse",
  Truck: "Moving truck",
  Package: "Box",
  Boxes: "Many boxes",
  Box: "Single box",
  PackageOpen: "Packing",
  BedDouble: "Bedroom",
  Bed: "Single bed",
  Sofa: "Sofa",
  Armchair: "Armchair",
  Piano: "Piano",
  Refrigerator: "Refrigerator",
  WashingMachine: "Washer / dryer",
  Vault: "Safe / heavy item",
  Weight: "Heavy lifting",
  Frame: "Artwork / mirrors",
  ChevronsUp: "Stairs",
  MoveVertical: "Elevator",
  Layers: "Floors",
  DoorOpen: "Long carry / access",
  Forklift: "Loading equipment",
  Route: "Route / long distance",
  MapPin: "Location",
  Car: "Vehicle",
  Calendar: "Date",
  CalendarClock: "Scheduled time",
  Clock: "Hours",
  Hourglass: "Waiting / flexible",
  Users: "Crew",
  User: "One person",
  Briefcase: "Business",
  DollarSign: "Price",
  Ruler: "Size",
  ArrowUpDown: "Up / down",
  Dog: "Dog",
  Cat: "Cat",
  Star: "Featured",
  Store: "Storefront",
};

/**
 * Icons shown in the picker UI. Excludes Dog, Cat, Star, and Store, which can
 * still be rendered in existing calculators but are not available for new picks.
 */
export const QUOTE_ICON_PICKER_NAMES = QUOTE_ICON_NAMES.filter(
  (name): name is Exclude<QuoteIconName, "Dog" | "Cat" | "Star" | "Store"> =>
    name !== "Dog" && name !== "Cat" && name !== "Star" && name !== "Store",
);

export type QuoteIconPickerName = (typeof QUOTE_ICON_PICKER_NAMES)[number];

export function getQuoteIcon(name: string): LucideIcon | null {
  if (name in iconMap) {
    return iconMap[name as QuoteIconName];
  }
  return null;
}

export function getQuoteIconLabel(name: string): string {
  if (name in QUOTE_ICON_LABELS) {
    return QUOTE_ICON_LABELS[name as QuoteIconName];
  }
  return name;
}
