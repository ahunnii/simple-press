"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { OliveBreadcrumbItem } from "../shared";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import {
  activeEntryIndex,
  getAccountNavLinks,
} from "~/app/(storefront)/_components/nav";

import { OliveBreadcrumb, OliveSection } from "../shared";

type Props = {
  children: ReactNode;
  heading: string;
  breadcrumb?: OliveBreadcrumbItem[];
};

/**
 * OliveAccountLayout — the shared shell for Settings, Security, Address Book,
 * Orders, Preferences and Subscriptions: an espresso band hero (Bodoni h1 +
 * breadcrumb), then a `[220px_1fr]` sand sidebar + content grid on desktop,
 * horizontally scrolling square tabs on mobile. The active item is marked by
 * an ivory face and heavier type. The outermost wrapper is `olive-account`, the shadcn bridge
 * the chrome CSS block already declares for the better-auth-ui cards and the
 * shared `AddressBookContent` / `PreferencesContent`.
 *
 * `OliveOrderDetailPage` does NOT use this layout — it renders its own hero
 * with a dynamic "Order #N" heading, matching vii's precedent.
 */
export function OliveAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();

  const navItems = getAccountNavLinks({ isEnabled });
  const activeIndex = activeEntryIndex(pathname, navItems);

  return (
    <div className="olive-account">
      <OliveSection tone="espresso" bleed>
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
        {/* Mobile: horizontally scrolling square tabs */}
        <nav aria-label="Account navigation" className="mb-8 md:hidden">
          <ul
            role="list"
            className="m-0 flex list-none gap-1.5 overflow-x-auto p-0 pb-2"
          >
            {navItems.map((item, i) => {
              const active = i === activeIndex;
              return (
                <li key={item.key} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className="olive-label inline-flex min-h-11 items-center border px-4 py-2 whitespace-nowrap"
                    style={{
                      backgroundColor: active
                        ? "var(--olive-espresso)"
                        : "transparent",
                      borderColor: active
                        ? "var(--olive-espresso)"
                        : "var(--olive-hairline-strong)",
                      color: active
                        ? "var(--olive-on-dark)"
                        : "var(--olive-espresso)",
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop: sand sidebar + content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
          <nav aria-label="Account navigation" className="hidden md:block">
            <ul
              role="list"
              className="m-0 flex list-none flex-col gap-1 p-0"
              style={{
                backgroundColor: "var(--olive-sand)",
                padding: "0.75rem",
              }}
            >
              {navItems.map((item, i) => {
                const active = i === activeIndex;
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="olive-label flex items-center px-3 py-3"
                      style={{
                        fontWeight: active ? 600 : 500,
                        color: "var(--olive-espresso)",
                        backgroundColor: active
                          ? "var(--olive-ivory)"
                          : "transparent",
                      }}
                    >
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
