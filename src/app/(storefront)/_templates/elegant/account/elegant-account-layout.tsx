"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookUser, Lock, Package, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/settings", label: "Settings", icon: Settings },
  { href: "/account/security", label: "Security", icon: Lock },
  { href: "/account/address-book", label: "Address Book", icon: BookUser },
  { href: "/account/preferences", label: "Preferences", icon: Bell },
] as const;

const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

type Props = {
  children: ReactNode;
  heading: string;
};

export function ElegantAccountLayout({ children, heading }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div style={{ background: "var(--el-cream, #f5f1ea)", minHeight: "100vh" }}>
      {/* ── Page header ── */}
      <section style={{ padding: "48px 40px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <span
            style={{
              fontFamily: "var(--font-mono, ui-monospace)",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "var(--el-ink-soft, #6b6659)",
              display: "block",
              marginBottom: 12,
            }}
          >
            Account
          </span>
          <h1
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 5vw, 60px)",
              lineHeight: 0.97,
              letterSpacing: "-0.01em",
              color: "var(--el-ink, #1c1a17)",
            }}
          >
            {heading}
          </h1>
        </div>
      </section>

      {/* ── Mobile tabs ── */}
      <nav
        aria-label="Account mobile navigation"
        style={{
          padding: "0 40px",
          overflowX: "auto",
          display: "flex",
          gap: 8,
          paddingBottom: 0,
          borderBottom: "1px solid var(--el-line, rgba(28,26,23,0.12))",
          marginBottom: 0,
        }}
        className="el-account-mobile-nav md:hidden"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                fontSize: 12,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "var(--font-mono, ui-monospace)",
                color: active
                  ? "var(--el-ink, #1c1a17)"
                  : "var(--el-ink-soft, #6b6659)",
                textDecoration: "none",
                borderBottom: active
                  ? "1px solid var(--el-ink, #1c1a17)"
                  : "1px solid transparent",
                marginBottom: -1,
                flexShrink: 0,
                transition: `color 0.3s ${ease}`,
              }}
              className="el-account-tab-link"
            >
              <Icon style={{ width: 13, height: 13 }} aria-hidden={true} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* ── Body: sidebar + content ── */}
      <section style={{ padding: "40px 40px 80px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: 60,
            alignItems: "start",
          }}
          className="el-account-grid"
        >
          {/* Desktop sidebar */}
          <nav
            aria-label="Account navigation"
            className="hidden md:block"
            style={{ position: "sticky", top: 120 }}
          >
            <ul role="list" style={{ listStyle: "none" }}>
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 0 10px 16px",
                        borderLeft: active
                          ? "1px solid var(--el-ink, #1c1a17)"
                          : "1px solid transparent",
                        fontSize: 13,
                        letterSpacing: "0.02em",
                        fontFamily: "var(--font-sans, sans-serif)",
                        color: active
                          ? "var(--el-ink, #1c1a17)"
                          : "var(--el-ink-soft, #6b6659)",
                        textDecoration: "none",
                        transition: `color 0.3s ${ease}, border-color 0.3s ${ease}`,
                      }}
                      className="el-account-nav-link"
                    >
                      <Icon
                        style={{ width: 14, height: 14, flexShrink: 0 }}
                        aria-hidden={true}
                      />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content */}
          <div style={{ minWidth: 0 }}>{children}</div>
        </div>
      </section>
    </div>
  );
}
