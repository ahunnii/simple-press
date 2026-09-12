"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { OliveBreadcrumbItem } from "../shared";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

import { OliveBreadcrumb, OliveChip, OliveSection } from "../shared";

type OliveAccountNavItem = {
  href: string;
  label: string;
  /** Gates the item behind a storefront feature flag. Omit for always-on items. */
  flag?: string;
};

const NAV_ITEMS: OliveAccountNavItem[] = [
  { href: "/account/orders", label: "Orders" },
  {
    href: "/account/subscriptions",
    label: "Subscriptions",
    flag: "subscriptions",
  },
  { href: "/account/settings", label: "Settings" },
  { href: "/account/security", label: "Security" },
  { href: "/account/address-book", label: "Address Book" },
  { href: "/account/preferences", label: "Preferences" },
];

type Props = {
  children: ReactNode;
  heading: string;
  breadcrumb?: OliveBreadcrumbItem[];
};

/**
 * OliveAccountLayout — the shared shell for Settings, Security, Address Book,
 * Orders, Preferences and Subscriptions: a slate band hero (h1 + breadcrumb,
 * no eyebrow — the craft floor bans kickers), then a `[220px_1fr]`
 * slate-tint-sidebar + content grid on desktop, horizontally scrolling pill
 * tabs on mobile. The active sidebar item carries a small leaf-coloured
 * `OliveChip`. The outermost wrapper is `olive-account`, the shadcn bridge
 * the chrome CSS block already declares for the better-auth-ui cards and the
 * shared `AddressBookContent` / `PreferencesContent`.
 *
 * `OliveOrderDetailPage` does NOT use this layout — it renders its own hero
 * with a dynamic "Order #N" heading, matching vii's precedent.
 */
export function OliveAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();

  const navItems = NAV_ITEMS.filter(
    (item) => !item.flag || isEnabled(item.flag),
  );

  function isActive(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="olive-account">
      <OliveSection tone="slate" bleed>
        <div>
          <h1 className="olive-h1" style={{ margin: 0 }}>
            {heading}
          </h1>
          {breadcrumb ? (
            <OliveBreadcrumb
              items={breadcrumb}
              style={{ marginTop: "0.75rem" }}
            />
          ) : null}
        </div>
      </OliveSection>

      <OliveSection>
        {/* Mobile: horizontally scrolling pill tabs */}
        <nav aria-label="Account navigation" className="mb-8 md:hidden">
          <ul
            role="list"
            className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 pb-2"
          >
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="olive-label inline-flex items-center rounded-full border px-4 py-2 whitespace-nowrap"
                    style={{
                      backgroundColor: active
                        ? "var(--olive-sage)"
                        : "var(--olive-paper)",
                      borderColor: active
                        ? "var(--olive-sage)"
                        : "var(--olive-hairline-strong)",
                      color: active ? "var(--olive-white)" : "var(--olive-ink)",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop: slate-tint sidebar + content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav aria-label="Account navigation" className="hidden md:block">
            <ul
              role="list"
              className="m-0 flex list-none flex-col gap-1 p-0"
              style={{
                backgroundColor: "var(--olive-slate-tint)",
                borderRadius: "var(--olive-card-radius)",
                padding: "0.75rem",
              }}
            >
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="flex items-center gap-2 rounded-[var(--olive-card-radius)] px-3 py-2 text-sm"
                      style={{
                        fontFamily: "var(--olive-font-body)",
                        fontWeight: active ? 600 : 400,
                        color: "var(--olive-ink)",
                        backgroundColor: active
                          ? "var(--olive-white)"
                          : "transparent",
                      }}
                    >
                      {active ? (
                        <OliveChip
                          color="var(--olive-leaf)"
                          label={item.label}
                          size={8}
                          srOnlyLabel={false}
                        />
                      ) : (
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                          }}
                        />
                      )}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div style={{ minWidth: 0 }}>{children}</div>
        </div>
      </OliveSection>
    </div>
  );
}
