"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Settings } from "lucide-react";

import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";

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
  breadcrumb?: { label: string; href?: string }[];
};

export function HappyBambooAccountLayout({
  children,
  heading,
  breadcrumb,
}: Props) {
  const pathname = usePathname();

  return (
    <>
      <section className="bg-secondary/40 py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <FadeIn direction="up">
            <p className="text-primary mb-2 text-sm font-semibold tracking-wider uppercase">
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
        {/* Mobile: horizontal scrolling tab bar */}
        <nav
          className="mb-8 flex gap-1 overflow-x-auto pb-2 md:hidden"
          aria-label="Account navigation"
        >
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/account/settings" || href === "/account/security"
                ? pathname.startsWith("/account/settings") ||
                  pathname.startsWith("/account/security")
                  ? pathname.startsWith(href)
                  : false
                : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
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
            <ul className="space-y-1">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-l-2 py-2.5 pr-4 pl-3 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-foreground/70 hover:bg-secondary/60 hover:text-foreground border-transparent",
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
