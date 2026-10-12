"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Route-based sub-nav for `/admin/invoices`, the same strip `InventoryTabs`
 * renders for inventory (see that file for why it's mounted by each page
 * right after `TrailHeader` rather than from a `layout.tsx`).
 *
 * The caller decides whether to render it at all: the Activity tab only makes
 * sense next to native invoices, so pages mount this behind
 * `flags.isEnabled("invoices")` — a QuickBooks-only store gets no empty tab.
 */

const TAB_CLASS =
  "focus-visible:outline-ring inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const TAB_ACTIVE = "border-primary text-primary";
const TAB_INACTIVE =
  "text-muted-foreground hover:border-border hover:text-foreground border-transparent";

const TABS = [
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/invoices/activity", label: "Activity" },
];

export function InvoicesTabs() {
  const pathname = usePathname();

  // Prefix match, not equality: the Invoices tab must stay highlighted on
  // /admin/invoices/[id] (and /new, /edit), but must NOT swallow
  // /admin/invoices/activity.
  const isActive = (href: string) => {
    if (href === "/admin/invoices") {
      return (
        pathname === href ||
        (pathname.startsWith(href + "/") &&
          !pathname.startsWith("/admin/invoices/activity"))
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav aria-label="Invoice views" className="border-border mb-6 border-b">
      <div className="no-scrollbar -mb-px flex overflow-x-auto">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`${TAB_CLASS} ${active ? TAB_ACTIVE : TAB_INACTIVE}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
