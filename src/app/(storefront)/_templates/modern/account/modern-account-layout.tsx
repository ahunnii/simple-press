"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Settings } from "lucide-react";

import { cn } from "~/lib/utils";

const NAV_ITEMS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/security", label: "Security", icon: Lock },
  { href: "/account/address-book", label: "Address Book", icon: BookUser },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
] as const;

type Props = {
  children: ReactNode;
  heading: string;
};

export function ModernAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  return (
    <>
      <section className="border-border bg-background border-b py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
            Account
          </p>
          <h1 className="text-foreground mt-2 font-serif text-4xl md:text-5xl">
            {heading}
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Mobile: horizontal scrolling tabs */}
        <nav className="mb-8 md:hidden" aria-label="Account navigation">
          <ul className="flex gap-1 overflow-x-auto pb-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium tracking-wide transition-colors",
                      active
                        ? "bg-foreground text-background"
                        : "bg-secondary text-foreground hover:bg-secondary/70",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop: sidebar + content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav className="hidden md:block" aria-label="Account navigation">
            <ul className="space-y-0.5">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 border-l-2 py-2.5 pr-4 pl-3 text-sm font-medium transition-colors",
                        active
                          ? "border-foreground text-foreground"
                          : "text-foreground/70 hover:border-foreground/50 hover:text-foreground border-transparent",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
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
