import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

/**
 * One entry in an `AdminFormMoreMenu`. Either `href` (an external link, e.g.
 * "View on storefront" — always opens in a new tab) or `onSelect` (an in-page
 * action, e.g. Reset/Duplicate/Delete) must be supplied, never both.
 */
export type AdminFormMoreMenuItem = {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  /**
   * Renders this item after a trailing separator, styled as a destructive
   * action (matches `DropdownMenuItem`'s `variant="destructive"`). The menu
   * groups all destructive items last regardless of where they appear in the
   * `items` array — see `AdminFormMoreMenu`.
   */
  destructive?: boolean;
} & (
  | { href: string; onSelect?: never }
  | { href?: never; onSelect: () => void }
);

export interface AdminFormMoreMenuProps {
  /**
   * Rendered in array order, except destructive items are always moved to
   * the end (after a single separator) regardless of their position here —
   * callers do not need to sort their own array. Omit an item from the array
   * entirely rather than passing it disabled/hidden; an empty array renders
   * nothing.
   */
  items: AdminFormMoreMenuItem[];
}

/**
 * The "More Options" dropdown that sits in the sticky `admin-form-toolbar` of
 * detail/edit forms (product, service, collection, and — soon — events,
 * videos, pages, blog). Reproduces the trigger, item order/grouping, and a11y
 * behaviour of the hand-rolled dropdown in `product-form.tsx` (lines
 * 936-1110, dropdown at 988-1061) so all forms read and behave identically.
 *
 * `type="button"` on the trigger matters: this menu lives inside a `<form>`
 * and must never submit it.
 */
export function AdminFormMoreMenu({ items }: AdminFormMoreMenuProps) {
  if (items.length === 0) return null;

  // Stable partition, not a sort — preserves each group's relative order
  // while still guaranteeing destructive items land after a single trailing
  // separator, per the contract above.
  const regularItems = items.filter((item) => !item.destructive);
  const destructiveItems = items.filter((item) => item.destructive);

  const renderItem = (item: AdminFormMoreMenuItem) => {
    const Icon = item.icon;

    if (item.href !== undefined) {
      return (
        <DropdownMenuItem
          key={item.label}
          asChild
          disabled={item.disabled}
          variant={item.destructive ? "destructive" : "default"}
        >
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.label} (opens in new tab)`}
          >
            <Icon className="mr-2 h-4 w-4" />
            {item.label}
          </a>
        </DropdownMenuItem>
      );
    }

    return (
      <DropdownMenuItem
        key={item.label}
        disabled={item.disabled}
        variant={item.destructive ? "destructive" : "default"}
        onClick={item.onSelect}
      >
        <Icon className="mr-2 h-4 w-4" />
        {item.label}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only ml-2 sm:not-sr-only">More Options</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {regularItems.map(renderItem)}
        {regularItems.length > 0 && destructiveItems.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {destructiveItems.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
