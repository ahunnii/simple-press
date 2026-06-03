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

export function NoiseAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

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
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
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
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
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
