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
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import {
  activeEntryIndex,
  getAccountNavLinks,
} from "~/app/(storefront)/_components/nav";

/** Icon per `AccountNavLink.key` — falls back to `Settings` for any future key. */
const NOISE_ACCOUNT_LINK_ICONS: Record<string, LucideIcon> = {
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

export function NoiseAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();

  const NAV_ITEMS = getAccountNavLinks({ isEnabled });
  const activeIndex = activeEntryIndex(pathname, NAV_ITEMS);

  return (
    <>
      {/* Editorial header */}
      <section
        className="border-foreground border-b-2"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="flex items-stretch" style={{ minHeight: "100px" }}>
          <div
            className="border-foreground/20 hidden flex-col justify-center gap-2 border-r px-7 py-6 md:flex"
            style={{ minWidth: "200px" }}
          >
            <span className="text-muted-foreground font-mono text-[9.5px] tracking-[0.22em] uppercase">
              My Account
            </span>
          </div>
          <div className="flex flex-1 items-center px-7 py-6">
            <h1
              className="font-serif leading-none tracking-tight italic"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {heading}
            </h1>
          </div>
        </div>

        {/* Mobile nav pills */}
        <nav
          className="flex gap-2 overflow-x-auto px-7 pt-1 pb-5 md:hidden"
          aria-label="Account navigation"
        >
          {NAV_ITEMS.map(({ key, href, label }, i) => {
            const Icon = NOISE_ACCOUNT_LINK_ICONS[key] ?? Settings;
            const active = i === activeIndex;
            return (
              <Link
                key={key}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "vn-stamp flex flex-shrink-0 items-center gap-1.5 text-[9.5px] transition-all",
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "hover:bg-foreground hover:text-background hover:border-foreground",
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="px-7 py-10" style={{ background: "var(--vn-paper)" }}>
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 md:grid-cols-[200px_1fr]">
          {/* Desktop sidebar */}
          <nav className="hidden md:block" aria-label="Account navigation">
            <ul className="flex flex-col gap-0">
              {NAV_ITEMS.map(({ key, href, label }, i) => {
                const Icon = NOISE_ACCOUNT_LINK_ICONS[key] ?? Settings;
                const active = i === activeIndex;
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 border-l-2 py-3 pr-4 pl-3 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors",
                        active
                          ? "border-foreground text-foreground"
                          : "border-foreground/10 text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
