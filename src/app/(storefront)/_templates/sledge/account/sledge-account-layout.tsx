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

export function SledgeAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  return (
    <>
      <section className="border-b border-[var(--sl-border)] bg-white px-7 pt-14 pb-8 md:pb-10">
        <div className="mx-auto max-w-7xl">
          <p className="sl-eyebrow mb-3 font-sans text-xs tracking-[0.18em] uppercase">
            My Account
          </p>
          <h1 className="sl-page-title-md font-heading uppercase">{heading}</h1>
        </div>

        <nav
          className="mx-auto mt-6 flex max-w-7xl gap-2 overflow-x-auto pb-1 md:hidden"
          aria-label="Account navigation"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-shrink-0 items-center gap-1.5 rounded-sm px-3 py-2 font-sans text-[10px] tracking-[0.16em] uppercase transition-all",
                  active
                    ? "sl-account-tab-active text-white"
                    : "sl-account-tab-inactive",
                )}
              >
                <Icon className="h-3 w-3" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="bg-white px-7 py-10">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
          <nav className="hidden md:block" aria-label="Account navigation">
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-sm py-2.5 pr-4 pl-3 font-sans text-xs tracking-[0.16em] uppercase transition-colors",
                        active
                          ? "sl-account-nav-active"
                          : "sl-account-nav-inactive",
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

          <div className="sl-account-content min-w-0">{children}</div>
        </div>
      </section>
    </>
  );
}
