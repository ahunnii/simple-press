"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Repeat, Settings } from "lucide-react";

import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { DreamH1 } from "../shared/dream-h1";
import { DreamReveal } from "../shared/dream-reveal";

const BASE_NAV_ITEMS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/subscriptions", label: "Subscriptions", icon: Repeat },
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

/**
 * Thin dream skin over the shared account UI — the `.dream-account` bridge
 * class (globals.css, Phase 2) maps shadcn vars onto dream tokens for the
 * wrapped better-auth-ui cards / `AddressBookContent` / `PreferencesContent`:
 * paper cards, ink primary, rose ring. Slim sky band with h1 + breadcrumb,
 * then pill tabs (mobile) / 220px sidebar (desktop) — design.md's Account
 * note. Structurally mirrors `wealth-account-layout.tsx`; the flag-gated
 * "Subscriptions" item follows the same convention.
 */
export function DreamAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const flags = useStorefrontFlags();

  const navItems = BASE_NAV_ITEMS.filter(
    (item) =>
      item.href !== "/account/subscriptions" ||
      flags.isEnabled("subscriptions"),
  );

  return (
    <div className="dream-account">
      {/* Slim sky band */}
      <section
        className="border-b border-[var(--dream-line)] py-10 sm:py-12"
        style={{
          background:
            "linear-gradient(180deg, var(--dream-sky) 0%, var(--dream-paper) 100%)",
        }}
      >
        <div className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)]">
          <DreamReveal>
            <DreamH1>{heading}</DreamH1>

            {breadcrumb ? (
              <nav aria-label="Breadcrumb" className="mt-4">
                <ol className="m-0 flex list-none flex-wrap items-center gap-0 p-0 text-[13px] text-[var(--dream-soft)]">
                  {breadcrumb.map((crumb, i) => (
                    <li key={crumb.label} className="flex items-center">
                      {i > 0 ? (
                        <span
                          aria-hidden="true"
                          className="mx-2 text-[var(--dream-soft)]"
                        >
                          /
                        </span>
                      ) : null}
                      {crumb.href ? (
                        <Link href={crumb.href} className="dream-link">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          aria-current="page"
                          className="text-[var(--dream-ink)]"
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
          </DreamReveal>
        </div>
      </section>

      {/* Nav + content */}
      <section className="mx-auto w-full [max-width:var(--dream-container)] px-[var(--dream-gutter)] py-12 sm:py-16">
        {/* Mobile: horizontal scrolling pill tab bar */}
        <nav aria-label="Account navigation" className="mb-8 md:hidden">
          <ul
            role="list"
            className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 pb-2"
          >
            {navItems.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname?.startsWith(`${href}/`);
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-[var(--dream-radius-pill)] border px-4 py-2 text-[13px] font-medium whitespace-nowrap",
                      active
                        ? "border-[var(--dream-ink)] bg-[var(--dream-ink)] text-[var(--dream-paper)]"
                        : "border-[var(--dream-line)] bg-[var(--dream-paper)] text-[var(--dream-ink)]",
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className="h-3.5 w-3.5 shrink-0"
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop: sidebar + content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav aria-label="Account navigation" className="hidden md:block">
            <ul role="list" className="m-0 list-none p-0">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <li key={href} className="mb-0.5">
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--dream-radius-input)] px-3.5 py-2.5 text-[14px] transition-colors",
                        active
                          ? "bg-[var(--dream-sky)] font-semibold text-[var(--dream-ink)]"
                          : "font-normal text-[var(--dream-soft)] hover:text-[var(--dream-ink)]",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        strokeWidth={1.5}
                        className="h-4 w-4 shrink-0"
                      />
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
    </div>
  );
}
