"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { formatPrice } from "~/lib/prices";
import { INVOICE_PAYMENT_RECORD_METHOD_LABELS } from "~/lib/validators/invoice";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { formatYmdLabel } from "./format";

export type InvoicePaymentRow = {
  id: string;
  amountCents: number;
  paidOnYmd: string;
  method: string;
  reference: string | null;
  note: string | null;
  receiptSentAt: Date | null;
};

type Props = {
  payments: InvoicePaymentRow[];
  /** Only owners/managers can undo a mis-entered payment — mirrors the
   *  destructive-action gating used elsewhere on this page (delete draft,
   *  cancel). The router itself allows any `ownerAdminProcedure`, so this is
   *  a UI-level courtesy, not the security boundary. */
  canDelete: boolean;
};

function methodLabel(method: string): string {
  const labels: Record<string, string> = INVOICE_PAYMENT_RECORD_METHOD_LABELS;
  return labels[method] ?? method;
}

export function InvoicePaymentsTable({ payments, canDelete }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const deletePayment = api.invoice.deletePayment.useMutation({
    onMutate: loadingToast("Deleting payment…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Payment deleted");
      setPendingDeleteId(null);
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete payment");
    },
  });

  if (payments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reference / note</TableHead>
              <TableHead>Receipt</TableHead>
              {canDelete && <TableHead className="w-9" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="whitespace-nowrap">
                  {formatYmdLabel(payment.paidOnYmd)}
                </TableCell>
                <TableCell>{methodLabel(payment.method)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatPrice(payment.amountCents)}
                </TableCell>
                <TableCell className="max-w-48 truncate text-sm">
                  {[payment.reference, payment.note]
                    .filter(Boolean)
                    .join(" — ") || "—"}
                </TableCell>
                <TableCell>
                  {payment.receiptSentAt ? (
                    <Badge variant="success">Sent</Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                {canDelete && (
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8"
                      aria-label="Delete payment"
                      onClick={() => setPendingDeleteId(payment.id)}
                      disabled={deletePayment.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The invoice&apos;s balance and status will be recalculated. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePayment.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePayment.isPending}
              onClick={() => {
                if (pendingDeleteId) {
                  deletePayment.mutate({ paymentId: pendingDeleteId });
                }
              }}
            >
              {deletePayment.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
