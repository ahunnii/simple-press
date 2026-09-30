"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BookUser,
  FileText,
  Gift,
  Lock,
  Package,
  Repeat,
  Settings,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { PageTransition } from "~/components/page-animations";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

/** Icon per `AccountNavLink.key` — falls back to `Settings` for any future key. */
const NAV_ICONS: Record<string, LucideIcon> = {
  orders: Package,
  "address-book": BookUser,
  subscriptions: Repeat,
  invoices: FileText,
  rewards: Gift,
  settings: Settings,
  security: Lock,
  preferences: Bell,
};

type Props = {
  children: ReactNode;
  heading: string;
};

/** Exact match, or a path segment under `href` — never a bare string prefix. */
function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PollenAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();
  const navItems = getAccountNavLinks({ isEnabled });

  return (
    <PageTransition>
      <section className="bg-[#f0f7ec] pt-44 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="mb-2 text-sm font-semibold tracking-wider text-[#5e7747] uppercase">
            Account
          </p>
          <h1 className="text-3xl font-bold text-[#374151]">{heading}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Mobile: horizontal scrolling tabs */}
        <nav
          className="mb-8 flex gap-1 overflow-x-auto pb-2 md:hidden"
          aria-label="Account navigation"
        >
          {navItems.map(({ key, href, label }) => {
            const Icon = NAV_ICONS[key] ?? Settings;
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#215935] text-white"
                    : "bg-gray-100 text-[#374151] hover:bg-gray-200",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: sidebar + content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav className="hidden md:block" aria-label="Account navigation">
            <ul className="space-y-0.5">
              {navItems.map(({ key, href, label }) => {
                const Icon = NAV_ICONS[key] ?? Settings;
                const active = isNavActive(pathname, href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-4 pl-3 text-sm font-medium transition-colors",
                        active
                          ? "border-[#5e8b4a] bg-[#5e8b4a]/10 text-[#215935]"
                          : "border-transparent text-[#4b5563] hover:bg-gray-100 hover:text-[#374151]",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-w-0">{children}</div>
        </div>
      </section>
    </PageTransition>
  );
}
