"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "~/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export const NEW_NATIVE_INVOICE_HREF = "/admin/invoices/new";

type Props = {
  /** `invoices` flag — the native builder. */
  invoicesEnabled: boolean;
  /**
   * Offer the QuickBooks path at all — the `quickbooks` flag, or (when
   * neither flag is on) existing QuickBooks rows, so a store that switched
   * QuickBooks off still sees the disabled button with its reason, as before.
   */
  showQuickBooks: boolean;
  /** QuickBooks is connected AND its flag is on — the QuickBooks dialog can actually submit. */
  qboCanAct: boolean;
  /** Why the QuickBooks path is unavailable, when it is (shown as the disabled reason). */
  qboDisabledReason?: string;
  /** Opens the existing QuickBooks `InvoiceFormDialog`. */
  onIssueViaQuickBooks: () => void;
};

/**
 * The page's primary create action, shaped by which invoicing paths are on:
 *
 * - `invoices` only → "New invoice", a link to the native builder.
 * - `quickbooks` only → the old QuickBooks "New invoice", which opens the
 *   dialog. Rendered but disabled (reason in `title`) when QuickBooks isn't
 *   connected or the flag is off, exactly as before.
 * - both → a split button: "New invoice" (native) plus a menu with "Issue via
 *   QuickBooks". The menu item stays listed while QuickBooks is disconnected,
 *   disabled with the reason inline, so the owner can see the option exists.
 * - neither → nothing to create.
 */
export function NewInvoiceButton({
  invoicesEnabled,
  showQuickBooks,
  qboCanAct,
  qboDisabledReason,
  onIssueViaQuickBooks,
}: Props) {
  if (invoicesEnabled && showQuickBooks) {
    return (
      <ButtonGroup aria-label="Create an invoice">
        <Button asChild>
          <Link href={NEW_NATIVE_INVOICE_HREF}>
            <Plus className="mr-2 h-4 w-4" />
            New invoice
          </Link>
        </Button>
        <ButtonGroupSeparator />
        {/* `modal={false}`: the item opens a Dialog, and a modal menu that is
            still tearing down its focus trap when the dialog mounts can leave
            `pointer-events: none` stuck on <body>. */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="icon" aria-label="More ways to create an invoice">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem
              disabled={!qboCanAct}
              onSelect={onIssueViaQuickBooks}
              className="flex-col items-start gap-0.5"
            >
              <span>Issue via QuickBooks</span>
              {!qboCanAct && qboDisabledReason && (
                <span className="text-muted-foreground text-xs">
                  {qboDisabledReason}
                </span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    );
  }

  if (invoicesEnabled) {
    return (
      <Button asChild>
        <Link href={NEW_NATIVE_INVOICE_HREF}>
          <Plus className="mr-2 h-4 w-4" />
          New invoice
        </Link>
      </Button>
    );
  }

  if (showQuickBooks) {
    return (
      <Button
        onClick={onIssueViaQuickBooks}
        disabled={!qboCanAct}
        title={qboCanAct ? undefined : qboDisabledReason}
      >
        <Plus className="mr-2 h-4 w-4" />
        New invoice
      </Button>
    );
  }

  return null;
}
