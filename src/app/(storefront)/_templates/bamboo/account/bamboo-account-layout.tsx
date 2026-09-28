"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  Lock,
  MapPin,
  Package,
  FileText,
  Gift,
  Repeat,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";
import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { BAMBOO_EMBLEM_CLEAR } from "../shared/bamboo-emblem-clearance";

/**
 * Icon for every key `getAccountNavLinks` can return, keyed to match (mirrors
 * happy-bamboo's `HB_ACCOUNT_LINK_ICONS`). Kept local since this template's
 * account sidebar is the only bamboo consumer.
 */
const BAM_ACCOUNT_LINK_ICONS: Record<string, LucideIcon> = {
  orders: Package,
  "address-book": MapPin,
  subscriptions: Repeat,
  invoices: FileText,
  rewards: Gift,
  settings: Settings,
  security: Lock,
  preferences: Bell,
  admin: LayoutDashboard,
};

type Props = {
  children: ReactNode;
  heading: string;
  breadcrumb?: { label: string; href?: string }[];
};

export function BambooAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();

  const navItems = getAccountNavLinks({ isEnabled }).map((link) => ({
    href: link.href,
    label: link.label,
    icon: BAM_ACCOUNT_LINK_ICONS[link.key] ?? Settings,
  }));

  return (
    <>
      <section className="bg-secondary">
        <div
          className={cn(
            "mx-auto max-w-7xl px-4 py-16 lg:px-8",
            BAMBOO_EMBLEM_CLEAR,
          )}
        >
          <FadeIn direction="up">
            <p className="mb-2 text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase">
              Account
            </p>
            <h1 className="font-heading text-foreground text-4xl font-bold">
              {heading}
            </h1>
            {breadcrumb && (
              <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-0 text-sm">
                {breadcrumb.map((crumb, i) => (
                  <span key={i} className="flex items-center">
                    {i > 0 && <span className="mx-2">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-primary">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        {/* Mobile: horizontal scrolling tabs */}
        <nav
          className="mb-8 flex gap-1 overflow-x-auto pb-2 md:hidden"
          aria-label="Account navigation"
        >
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/70",
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
            <ul className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-l-4 py-2.5 pr-4 pl-3 text-sm font-medium transition-colors",
                        active
                          ? "border-[var(--bam-forest)] bg-[var(--bam-gold-soft)]/40 text-[var(--bam-forest-deep)]"
                          : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground border-transparent",
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
    </>
  );
}
