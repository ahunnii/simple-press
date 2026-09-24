"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { UnifiedInvoiceRow } from "~/lib/invoices/unified-list";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";

type Props = {
  row: Pick<UnifiedInvoiceRow, "id" | "displayNumber" | "status" | "href">;
  /**
   * `invoices` flag. Edit and Delete draft are `featureGate("invoices")` on
   * the server, so they aren't offered while it's off; View always is —
   * turning the feature off never hides a money record.
   */
  invoicesEnabled: boolean;
};

/**
 * Row menu for a native invoice. Deliberately small: the detail page owns
 * every lifecycle action (send, record payment, remind, cancel), so the row
 * only offers the jump there plus the two draft-only shortcuts.
 */
export function NativeInvoiceRowActions({ row, invoicesEnabled }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDraft = row.status === "draft";
  const canEditDraft = isDraft && invoicesEnabled;
  const viewHref = row.href ?? `/admin/invoices/${row.id}`;

  const deleteMutation = api.invoice.deleteDraft.useMutation({
    onMutate: loadingToast("Deleting draft…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(`Draft ${row.displayNumber} deleted`);
      setConfirmOpen(false);
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to delete draft");
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Actions for {row.displayNumber}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={viewHref}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          {canEditDraft && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/admin/invoices/${row.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete draft
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canEditDraft && (
        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!deleteMutation.isPending) setConfirmOpen(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete draft {row.displayNumber}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                The draft was never sent, so no customer has seen it. This
                can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              {/* `variant`, not className — see the note on the Discounts
                  delete dialog: a className here loses to Button's primary
                  fill and renders black. `preventDefault` keeps the dialog
                  open until the mutation settles. */}
              <AlertDialogAction
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  deleteMutation.mutate({ id: row.id });
                }}
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete draft"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
