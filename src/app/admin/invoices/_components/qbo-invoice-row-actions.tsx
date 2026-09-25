"use client";

import { useRouter } from "next/navigation";
import {
  ExternalLink,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminFormMoreMenuItem } from "../../_components/admin-form-more-menu";
import type { UnifiedInvoiceRow } from "~/lib/invoices/unified-list";
import type { QboEnvironment } from "~/lib/quickbooks/constants";
import { qboInvoiceUrl } from "~/lib/quickbooks/constants";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";

type Props = {
  /**
   * `row.rawStatus` is the raw `QuickBooksInvoice.status`, which is what
   * decides Send vs Resend vs Retry below; `row.qbo` carries the rest of the
   * QuickBooks-only fields (`UnifiedInvoiceRow` is otherwise source-neutral).
   * Callers only reach this component for a `source: "quickbooks"` row, where
   * `listUnified` always populates `qbo` — still optional in the type since
   * `UnifiedInvoiceRow` doesn't discriminate on `source`.
   */
  row: Pick<UnifiedInvoiceRow, "id" | "rawStatus" | "qbo">;
  /** Names the row for the trigger's accessible label. */
  label: string;
  environment: QboEnvironment;
  /** `quickbooks` flag. Off → only the outbound "Open in QuickBooks" link survives. */
  featureEnabled: boolean;
};

/**
 * Per-row QuickBooks actions, lifted out of the old QuickBooks-only
 * `/admin/invoices` table unchanged in behaviour: Send (created) / Resend
 * (sent, overdue), Refresh status (once QuickBooks has an id), Retry (error,
 * pending) — all dropped while the feature is off — plus the "Open in
 * QuickBooks" link, which stays regardless.
 *
 * Each row owns its three mutations, so "pending" is naturally per-row (the
 * old table compared `mutation.variables.id` against the row to get the same
 * effect from one shared set).
 */
export function QboInvoiceRowActions({
  row,
  label,
  environment,
  featureEnabled,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const qboInvoiceId = row.qbo?.qboInvoiceId ?? null;

  /**
   * No optimistic updates (rows arrive as RSC props, so there is no client
   * cache entry to patch): invalidate the QuickBooks queries — the connection
   * and lead-invoice caches both change on a send/refresh — and re-render the
   * server component.
   */
  const afterWrite = () => {
    void utils.quickbooks.invalidate();
    void utils.invoice.invalidate();
    router.refresh();
  };

  const sendMutation = api.quickbooks.sendInvoice.useMutation({
    onMutate: loadingToast("Sending…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice sent");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to send invoice");
    },
  });

  const refreshMutation = api.quickbooks.refreshInvoice.useMutation({
    onMutate: loadingToast("Refreshing…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice status refreshed");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to refresh invoice");
    },
  });

  const retryMutation = api.quickbooks.retryInvoice.useMutation({
    onMutate: loadingToast("Retrying…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice retried");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to retry invoice");
    },
  });

  const pending =
    sendMutation.isPending ||
    refreshMutation.isPending ||
    retryMutation.isPending;

  const items: AdminFormMoreMenuItem[] = [];

  // Send/Resend/Refresh/Retry all mutate or call Intuit, so they drop out
  // entirely while the feature is off — "Open in QuickBooks" below is a plain
  // outbound link and stays regardless.
  if (featureEnabled) {
    if (row.rawStatus === "created") {
      items.push({
        label: "Send",
        icon: Send,
        disabled: pending,
        onSelect: () => sendMutation.mutate({ id: row.id }),
      });
    } else if (row.rawStatus === "sent" || row.rawStatus === "overdue") {
      items.push({
        label: "Resend",
        icon: Send,
        disabled: pending,
        onSelect: () => sendMutation.mutate({ id: row.id }),
      });
    }

    if (qboInvoiceId) {
      items.push({
        label: "Refresh status",
        icon: RefreshCw,
        disabled: pending,
        onSelect: () => refreshMutation.mutate({ id: row.id }),
      });
    }

    if (row.rawStatus === "error" || row.rawStatus === "pending") {
      items.push({
        label: "Retry",
        icon: RotateCcw,
        disabled: pending,
        onSelect: () => retryMutation.mutate({ id: row.id }),
      });
    }
  }

  if (qboInvoiceId) {
    items.push({
      label: "Open in QuickBooks",
      icon: ExternalLink,
      href: qboInvoiceUrl(environment, qboInvoiceId),
    });
  }

  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Actions for {label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((action) => {
          const Icon = action.icon;
          if (action.href !== undefined) {
            return (
              <DropdownMenuItem key={action.label} asChild>
                <a
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${action.label} (opens in new tab)`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </a>
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuItem
              key={action.label}
              disabled={action.disabled}
              onClick={action.onSelect}
            >
              <Icon className="mr-2 h-4 w-4" />
              {action.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
