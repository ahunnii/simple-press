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
import { getAccountNavLinks } from "~/app/(storefront)/_components/nav";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

/** Icon per `AccountNavLink.key` — falls back to `Settings` for any future key. */
const VII_ACCOUNT_LINK_ICONS: Record<string, LucideIcon> = {
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
  breadcrumb?: { label: string; href?: string }[];
};

/** Exact match, or a path segment under `href` — never a bare string prefix. */
function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ViiAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const { ref: heroRef, visible: heroVisible } = useViiReveal(0.08);
  const { isEnabled } = useStorefrontFlags();
  const navItems = getAccountNavLinks({ isEnabled });

  return (
    <div className="vii-account">
      {/* Hero band — cream tone with overline + serif heading */}
      <section
        style={{
          background: "var(--vii-cream)",
          borderBottom: "1px solid var(--vii-hairline-strong)",
          paddingTop: "clamp(168px, 16vh, 200px)",
          paddingBottom: "clamp(32px, 5vh, 60px)",
        }}
      >
        <div
          style={{
            maxWidth: 1320,
            margin: "0 auto",
            paddingInline: "clamp(20px, 4vw, 32px)",
          }}
        >
          <div
            ref={heroRef}
            className={cn("vii-reveal", heroVisible && "is-visible")}
          >
            <ViiOverline style={{ marginBottom: 16 }}>Account</ViiOverline>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                fontWeight: 500,
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
            </h1>
            {breadcrumb && (
              <nav aria-label="Breadcrumb" style={{ marginTop: 12 }}>
                <ol
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 0,
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--vii-ink-soft)",
                  }}
                >
                  {breadcrumb.map((crumb, i) => (
                    <li
                      key={i}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      {i > 0 && (
                        <span
                          aria-hidden
                          style={{
                            marginInline: "0.5rem",
                            color: "var(--vii-tan)",
                          }}
                        >
                          /
                        </span>
                      )}
                      {crumb.href ? (
                        <Link
                          href={crumb.href}
                          style={{
                            color: "var(--vii-ink-soft)",
                            textDecoration: "none",
                            position: "relative",
                          }}
                          className="vii-nav-link"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          aria-current="page"
                          style={{ color: "var(--vii-navy)" }}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </div>
      </section>

      {/* Content area */}
      <section
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          paddingInline: "clamp(20px, 4vw, 32px)",
          paddingTop: "clamp(32px, 5vh, 60px)",
          paddingBottom: "clamp(48px, 7vh, 96px)",
        }}
      >
        {/* Mobile: horizontal scrolling pill tab bar */}
        <nav
          aria-label="Account navigation"
          style={{ marginBottom: 32 }}
          className="md:hidden"
        >
          <ul
            role="list"
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 8,
              listStyle: "none",
              margin: 0,
              padding: "0 0 8px",
            }}
          >
            {navItems.map(({ key, href, label }) => {
              const Icon = VII_ACCOUNT_LINK_ICONS[key] ?? Settings;
              const active = isNavActive(pathname, href);
              return (
                <li key={key} style={{ flexShrink: 0 }}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      borderRadius: "var(--radius)",
                      padding: "8px 16px",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      textDecoration: "none",
                      transition: "background 0.2s, color 0.2s",
                      background: active
                        ? "var(--vii-copper-deep)"
                        : "var(--vii-paper)",
                      color: active ? "var(--vii-paper)" : "var(--vii-navy)",
                      border: active
                        ? "1px solid var(--vii-copper-deep)"
                        : "1px solid var(--vii-hairline-strong)",
                    }}
                  >
                    <Icon
                      aria-hidden
                      style={{ width: 14, height: 14, flexShrink: 0 }}
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop: sidebar + content */}
        <div
          className={cn("grid grid-cols-1 gap-8", "md:grid-cols-[220px_1fr]")}
        >
          <nav aria-label="Account navigation" className="hidden md:block">
            <ul
              role="list"
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {navItems.map(({ key, href, label }) => {
                const Icon = VII_ACCOUNT_LINK_ICONS[key] ?? Settings;
                const active = isNavActive(pathname, href);
                return (
                  <li key={key} style={{ marginBottom: 2 }}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className="vii-nav-link"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        borderRadius: "var(--radius)",
                        padding: "10px 14px",
                        fontFamily: "var(--font-sans)",
                        fontSize: 14,
                        fontWeight: active ? 500 : 400,
                        letterSpacing: "0.02em",
                        textDecoration: "none",
                        transition: "background 0.15s, color 0.15s",
                        background: active ? "var(--vii-tan)" : "transparent",
                        color: active
                          ? "var(--vii-navy)"
                          : "var(--vii-ink-soft)",
                        position: "relative",
                      }}
                    >
                      <Icon
                        aria-hidden
                        style={{ width: 16, height: 16, flexShrink: 0 }}
                      />
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
