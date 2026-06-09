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

export function DefaultAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  return (
    <div>
      {/* Page header */}
      <section className="border-b border-[#e8e8e8] px-6 pt-16 pb-10 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <nav
            aria-label="Breadcrumb"
            className="mb-4 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
          >
            <Link href="/" className="transition-colors hover:text-[#0a0a0a]">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Account</span>
          </nav>
          <h1 className="font-serif text-[clamp(28px,3.5vw,48px)] leading-tight font-semibold tracking-[-0.025em]">
            {heading}
          </h1>
        </div>
      </section>

      {/* Mobile tabs */}
      <nav
        className="border-b border-[#e8e8e8] px-6 md:hidden"
        aria-label="Account navigation (mobile)"
      >
        <div className="mx-auto max-w-[1440px]">
          <ul className="m-0 flex list-none gap-0 overflow-x-auto p-0">
            {NAV_ITEMS.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block shrink-0 border-b-[2px] px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border-[#0a0a0a] text-[#0a0a0a]"
                        : "border-transparent text-[#6b6b6b] hover:text-[#0a0a0a]",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Desktop layout */}
      <section className="px-6 py-12 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[180px_1fr]">
            {/* Sidebar (desktop) */}
            <nav className="hidden md:block" aria-label="Account navigation">
              <ul className="flex flex-col gap-0.5">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href || pathname.startsWith(href + "/");
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-[#f6f6f6] text-[#0a0a0a]"
                            : "text-[#6b6b6b] hover:bg-[#f6f6f6] hover:text-[#0a0a0a]",
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
        </div>
      </section>
    </div>
  );
}
