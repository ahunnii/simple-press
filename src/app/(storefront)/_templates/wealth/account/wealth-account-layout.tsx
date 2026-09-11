"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Repeat, Settings } from "lucide-react";

import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { WealthEyebrow } from "../shared/wealth-eyebrow";
import { WealthH1 } from "../shared/wealth-h1";
import { WealthReveal } from "../shared/wealth-reveal";

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
 * Thin DCWF skin over the shared account UI — `.wealth-account` bridge class
 * (declared in globals.css by Phase 2) maps shadcn vars onto wealth tokens
 * for the wrapped better-auth-ui cards / AddressBookContent / PreferencesContent:
 * white square cards, primary-green actions, Titillium. Structurally mirrors
 * `vii-account-layout.tsx`; the mobile-pill/desktop-sidebar nav pattern and
 * the flag-gated "Subscriptions" item follow `happy-bamboo-account-layout.tsx`
 * (vii itself has no Subscriptions slot to crib from).
 */
export function WealthAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const flags = useStorefrontFlags();

  const NAV_ITEMS = BASE_NAV_ITEMS.filter(
    (item) => item.href !== "/account/subscriptions" || flags.isEnabled("subscriptions"),
  );

  return (
    <div className="wealth-account">
      {/* Hero band */}
      <section
        style={{
          background: "var(--wealth-surface)",
          borderBottom: "1px solid var(--wealth-surface-2)",
          paddingTop: "calc(var(--wealth-rhythm) * 2)",
          paddingBottom: "calc(var(--wealth-rhythm) * 1.5)",
        }}
      >
        <div
          className="mx-auto"
          style={{ maxWidth: "var(--wealth-container)", padding: "0 var(--wealth-gutter)" }}
        >
          <WealthReveal>
            <WealthEyebrow as="p" className="mb-3">
              Account
            </WealthEyebrow>
            <WealthH1>{heading}</WealthH1>

            {breadcrumb && (
              <nav aria-label="Breadcrumb" style={{ marginTop: 16 }}>
                <ol
                  className="flex flex-wrap items-center gap-0"
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    fontFamily: "var(--font-wealth-body)",
                    fontSize: 13,
                    color: "var(--wealth-muted)",
                  }}
                >
                  {breadcrumb.map((crumb, i) => (
                    <li key={i} className="flex items-center">
                      {i > 0 && (
                        <span aria-hidden style={{ margin: "0 8px", color: "var(--wealth-muted)" }}>
                          /
                        </span>
                      )}
                      {crumb.href ? (
                        <Link
                          href={crumb.href}
                          style={{ color: "var(--wealth-muted)", textDecoration: "none" }}
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span aria-current="page" style={{ color: "var(--wealth-ink)" }}>
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </WealthReveal>
        </div>
      </section>

      {/* Content area */}
      <section
        className="mx-auto"
        style={{
          maxWidth: "var(--wealth-container)",
          padding: "calc(var(--wealth-rhythm) * 1.5) var(--wealth-gutter) calc(var(--wealth-rhythm) * 2)",
        }}
      >
        {/* Mobile: horizontal scrolling pill tab bar */}
        <nav aria-label="Account navigation" className="mb-8 md:hidden">
          <ul role="list" className="flex list-none gap-1.5 overflow-x-auto p-0 pb-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 16px",
                      fontFamily: "var(--font-wealth-body)",
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      background: active ? "var(--wealth-primary)" : "var(--wealth-paper)",
                      color: active ? "var(--wealth-paper)" : "var(--wealth-ink)",
                      border: `1px solid ${active ? "var(--wealth-primary)" : "var(--wealth-surface-2)"}`,
                    }}
                  >
                    <Icon aria-hidden style={{ width: 14, height: 14, flexShrink: 0 }} />
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
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href} style={{ marginBottom: 2 }}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors",
                      )}
                      style={{
                        fontFamily: "var(--font-wealth-body)",
                        fontWeight: active ? 600 : 400,
                        textDecoration: "none",
                        background: active ? "var(--wealth-surface)" : "transparent",
                        color: active ? "var(--wealth-ink)" : "var(--wealth-muted)",
                      }}
                    >
                      <Icon aria-hidden style={{ width: 16, height: 16, flexShrink: 0 }} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div style={{ minWidth: 0 }}>{children}</div>
        </div>
      </section>
    </div>
  );
}
