"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookUser, Bell, Lock, Package, Settings } from "lucide-react";

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

export function DarkTrendAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  return (
    <>
      <section className="border-b border-white/10 bg-[#1A1A1A] py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* S-11: text-white/40 → text-white/60 for the "Account" eyebrow */}
          <p className="text-xs font-semibold tracking-[0.2em] text-white/60 uppercase">
            Account
          </p>
          <h1 className="mt-2 text-4xl font-bold text-white">{heading}</h1>
        </div>
      </section>

      <section className="bg-[#1A1A1A] py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Mobile: horizontal scrolling tabs */}
        <nav
          className="mb-8 flex gap-1 overflow-x-auto pb-2 md:hidden"
          aria-label="Account navigation"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
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
                        "flex items-center gap-3 border-l-2 py-2.5 pl-3 pr-4 text-sm font-medium transition-colors",
                        active
                          ? "border-purple-500 text-purple-400"
                          : "border-transparent text-white/60 hover:border-white/20 hover:text-white/70",
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
        </div>
      </section>
    </>
  );
}
