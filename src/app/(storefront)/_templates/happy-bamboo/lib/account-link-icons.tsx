import type { ReactNode } from "react";
import {
  FileText,
  Gift,
  LayoutDashboard,
  MapPin,
  Package,
  Repeat,
  Settings,
  Shield,
  SlidersHorizontal,
} from "lucide-react";

/**
 * Icon for every key `getAccountNavLinks`
 * (`~/app/(storefront)/_components/nav`) can return, keyed to match. Shared
 * by the header's desktop `UserButton` menu (`layout/happy-bamboo-header.tsx`)
 * and the account sidebar (`account/happy-bamboo-account-layout.tsx`), so
 * both agree on iconography. `h-4 w-4` — the fixed size every consumer uses.
 */
export const HB_ACCOUNT_LINK_ICONS: Record<string, ReactNode> = {
  orders: <Package className="h-4 w-4" aria-hidden />,
  "address-book": <MapPin className="h-4 w-4" aria-hidden />,
  subscriptions: <Repeat className="h-4 w-4" aria-hidden />,
  invoices: <FileText className="h-4 w-4" aria-hidden />,
  rewards: <Gift className="h-4 w-4" aria-hidden />,
  settings: <Settings className="h-4 w-4" aria-hidden />,
  security: <Shield className="h-4 w-4" aria-hidden />,
  preferences: <SlidersHorizontal className="h-4 w-4" aria-hidden />,
  admin: <LayoutDashboard className="h-4 w-4" aria-hidden />,
};

/**
 * Quick-access account keys shown in the header's desktop avatar menu and the
 * 390 mobile menu's account block (B4.3/B4.4 decision, 2026-09-27). The full
 * list (address book, subscriptions, invoices, rewards, security,
 * preferences) lives only in the account sidebar, one tap away via Settings.
 */
export const HB_QUICK_ACCOUNT_KEYS = new Set(["orders", "settings", "admin"]);
