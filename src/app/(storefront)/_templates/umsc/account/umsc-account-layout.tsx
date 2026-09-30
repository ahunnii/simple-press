"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Bell,
  BookUser,
  FileText,
  Lock,
  Package,
  Repeat,
  Settings,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { useStorefrontFlags } from "~/providers/feature-flags-context";
import {
  activeEntryIndex,
  getAccountNavLinks,
} from "~/app/(storefront)/_components/nav";

export type UmscAccountBreadcrumbItem = { label: string; href?: string };

/**
 * `getAccountNavLinks` returns bare `{key, label, href}` entries — icons are
 * mapped locally by key (noise/dream precedent). Any key the mapping doesn't
 * recognize (there shouldn't be one) falls back to `Settings`.
 */
const UMSC_ACCOUNT_LINK_ICONS: Record<string, typeof Package> = {
  orders: Package,
  "address-book": BookUser,
  subscriptions: Repeat,
  invoices: FileText,
  rewards: Award,
  settings: Settings,
  security: Lock,
  preferences: Bell,
};

type Props = {
  children: ReactNode;
  heading: string;
  breadcrumb?: UmscAccountBreadcrumbItem[];
};

/**
 * On-black breadcrumb trail. The shared `UmscBreadcrumb` hardcodes ink/line
 * colors for light surfaces only — reusing it on this band's black ground
 * would render the current-page item near-invisible, so this band gets its
 * own cream-on-black variant instead.
 */
function UmscAccountBandBreadcrumb({
  items,
}: {
  items: UmscAccountBreadcrumbItem[];
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="umsc-sans mt-4 flex flex-wrap items-center gap-2 text-[13px] font-medium tracking-[0.06em] text-[var(--umsc-gold-soft)] uppercase"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? "page" : undefined}
                className="text-[var(--umsc-cream-on-black)]"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-[var(--umsc-gold-soft)] hover:text-[var(--umsc-cream-on-black)]"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <span aria-hidden="true" className="text-[var(--umsc-line-gold)]">
                /
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * UmscAccountLayout — slim black band (h1 + breadcrumb), then pill tabs
 * (mobile) / `[220px_1fr]` sidebar (desktop). Wraps content in `.umsc-account`
 * — the shadcn bridge class the chrome CSS block already declares for the
 * better-auth-ui cards and the shared `AddressBookContent` /
 * `PreferencesContent`. Operate mode: no `UmscReveal` here (design.md: "Cart
 * / checkout / account: no reveals").
 *
 * Nav entries come from `getAccountNavLinks` (never a hand-written list), so
 * flag gating (Orders/Address Book/Subscriptions/Invoices/Rewards) always
 * matches the platform baseline; icons are mapped locally by key.
 *
 * `UmscOrderDetailPage` renders inside this layout too (heading = "Order
 * #N", breadcrumb ending on the order number) — Orders stays active via
 * `activeEntryIndex`'s prefix match on `/account/orders`.
 */
export function UmscAccountLayout({ children, heading, breadcrumb }: Props) {
  const pathname = usePathname();
  const { isEnabled } = useStorefrontFlags();

  const navItems = getAccountNavLinks({ isEnabled });
  const activeIndex = activeEntryIndex(pathname, navItems);

  return (
    <div className="umsc-account">
      {/* Slim black band */}
      <section className="bg-[var(--umsc-black)] px-6 py-10 sm:px-8">
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          <h1 className="umsc-serif text-[clamp(28px,3.6vw,40px)] font-normal text-[var(--umsc-cream-on-black)]">
            {heading}
          </h1>
          {breadcrumb && <UmscAccountBandBreadcrumb items={breadcrumb} />}
        </div>
      </section>

      {/* Nav + content */}
      <section className="px-6 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto" style={{ maxWidth: "var(--umsc-container)" }}>
          {/* Mobile: horizontally scrolling pill tabs */}
          <nav aria-label="Account navigation" className="mb-8 md:hidden">
            <ul
              role="list"
              className="m-0 flex list-none gap-2 overflow-x-auto p-0 pb-2"
            >
              {navItems.map((item, i) => {
                const active = i === activeIndex;
                const Icon = UMSC_ACCOUNT_LINK_ICONS[item.key] ?? Settings;
                return (
                  <li key={item.key} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "umsc-sans inline-flex items-center gap-1.5 rounded-[var(--umsc-radius-pill)] border px-4 py-2 text-[13px] font-medium whitespace-nowrap",
                        active
                          ? "border-[var(--umsc-gold)] bg-[var(--umsc-gold)] text-[var(--umsc-ink)]"
                          : "border-[var(--umsc-line)] bg-[var(--umsc-white)] text-[var(--umsc-ink)]",
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                        strokeWidth={1.5}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Desktop: sidebar + content */}
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[220px_1fr]">
            <nav aria-label="Account navigation" className="hidden md:block">
              <ul role="list" className="m-0 flex list-none flex-col gap-1 p-0">
                {navItems.map((item, i) => {
                  const active = i === activeIndex;
                  const Icon = UMSC_ACCOUNT_LINK_ICONS[item.key] ?? Settings;
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "umsc-sans flex items-center gap-3 px-3.5 py-2.5 text-[14px]",
                          active
                            ? "bg-[var(--umsc-cream)] font-semibold text-[var(--umsc-ink)]"
                            : "font-normal text-[var(--umsc-muted)] hover:text-[var(--umsc-ink)]",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-4 shrink-0"
                          strokeWidth={1.5}
                        />
                        {item.label}
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
