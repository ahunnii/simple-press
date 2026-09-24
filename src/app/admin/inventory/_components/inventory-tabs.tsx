"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Route-based sub-nav for `/admin/inventory`, styled after `HubSubNav`
 * (`../../_components/hub-sub-nav.tsx`) — the same border-bottom strip the
 * Settings/Content hubs use for their own route-based tabs, scaled down to
 * this section's fixed three tabs instead of a flag-filtered card list.
 *
 * `layout.tsx` can't render this around `{children}` in a way that reads
 * naturally with `TrailHeader`: every inventory page puts its own
 * `TrailHeader` first (breadcrumbs differ per page — the detail page adds the
 * item name), and a layout wrapping `{children}` would land the tab strip
 * either above that breadcrumb bar or with no way to sit between it and the
 * page's `admin-container`. `TestimonialsTabs` solves the same problem the
 * same way: it's `"use client"` too, but is mounted inside
 * `admin/testimonials/page.tsx` itself, right after `TrailHeader`. This file
 * follows that placement — each inventory page under this workstream mounts
 * `<InventoryTabs rentalsEnabled={…} />` there.
 *
 * `rentalsEnabled` comes from the page (`getBusinessFlags()` is a server-only
 * call this client component can't make itself), not from a hook here.
 */

type Props = {
  rentalsEnabled: boolean;
};

const TAB_CLASS =
  "focus-visible:outline-ring inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const TAB_ACTIVE = "border-primary text-primary";
const TAB_INACTIVE =
  "text-muted-foreground hover:border-border hover:text-foreground border-transparent";

const TABS: {
  href: string;
  label: string;
  rentalsOnly?: boolean;
}[] = [
  { href: "/admin/inventory", label: "Items" },
  {
    href: "/admin/inventory/checkouts",
    label: "Check-outs",
    rentalsOnly: true,
  },
  { href: "/admin/inventory/activity", label: "Activity" },
];

export function InventoryTabs({ rentalsEnabled }: Props) {
  const pathname = usePathname();

  // Prefix match, not equality: the Items tab must stay highlighted on
  // /admin/inventory/[id], and it must NOT swallow /admin/inventory/checkouts
  // or /admin/inventory/activity — so "/admin/inventory" only counts as a
  // prefix match when the next character is "/" or the string ends there,
  // and the other two tabs' own (non-prefixed) hrefs are checked first.
  const isActive = (href: string) => {
    if (href === "/admin/inventory") {
      return (
        pathname === href ||
        (pathname.startsWith(href + "/") &&
          !pathname.startsWith("/admin/inventory/checkouts") &&
          !pathname.startsWith("/admin/inventory/activity"))
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <nav aria-label="Inventory views" className="border-border mb-6 border-b">
      <div className="no-scrollbar -mb-px flex overflow-x-auto">
        {TABS.filter((tab) => !tab.rentalsOnly || rentalsEnabled).map((tab) => {
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
