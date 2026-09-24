"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
  dismissLoadingToast,
  loadingToast,
} from "../../../_lib/admin-mutation-toast";
import { CancelInvoiceDialog } from "./cancel-invoice-dialog";
import { formatInstant } from "./format";
import { RecordPaymentDialog } from "./record-payment-dialog";
import { SendInvoiceDialog } from "./send-invoice-dialog";
import { SendReminderDialog } from "./send-reminder-dialog";

type Invoice = RouterOutputs["invoice"]["getById"];

type Props = {
  invoice: Invoice;
};

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(url);
    toast.success("Invoice link copied");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      Copy link
    </Button>
  );
}

function DeleteDraftButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);

  const deleteDraft = api.invoice.deleteDraft.useMutation({
    onMutate: loadingToast("Deleting draft…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Draft deleted");
      void utils.invoice.invalidate();
      router.push("/admin/invoices");
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete draft");
      setOpen(false);
    },
  });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        Delete draft
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the draft. It hasn&apos;t been sent to
              the customer, so nothing needs to be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDraft.isPending}>
              Keep draft
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteDraft.isPending}
              onClick={() => deleteDraft.mutate({ id: invoiceId })}
            >
              {deleteDraft.isPending ? "Deleting…" : "Delete draft"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * The action bar for the invoice detail page. Every action's visibility
 * follows `invoice.capabilities` (edit/send/delete/remind already AND the
 * `invoices` flag server-side) plus two exceptions that are NEVER
 * flag-gated: recording/deleting payments and cancelling — turning the
 * feature off must never freeze money already in motion.
 */
export function InvoiceActions({ invoice }: Props) {
  const { capabilities, status } = invoice;
  const isOpenStatus = status === "SENT" || status === "PARTIALLY_PAID";
  const canPrint = status !== "DRAFT";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!invoice.invoicesEnabled && (
        <Alert className="w-full py-2 sm:w-auto sm:min-w-64 sm:flex-1">
          <AlertDescription className="text-xs">
            Invoicing is turned off — creating, editing, sending, reminding and
            deleting drafts are disabled. Recording payments and cancelling
            still work.
          </AlertDescription>
        </Alert>
      )}

      {capabilities.canEdit && (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/invoices/${invoice.id}/edit`}>
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      )}

      {capabilities.canSend && (
        <SendInvoiceDialog
          invoice={{
            id: invoice.id,
            displayNumber: invoice.displayNumber,
            customerEmail: invoice.customerEmail,
            totalCents: invoice.totalCents,
            dueTerms: invoice.dueTerms,
            dueDateYmd: invoice.dueDateYmd,
            timeZone: invoice.timeZone,
          }}
        />
      )}

      {capabilities.canDelete && <DeleteDraftButton invoiceId={invoice.id} />}

      {capabilities.canRecordPayment && (
        <RecordPaymentDialog
          invoiceId={invoice.id}
          balanceCents={invoice.balanceCents}
          timeZone={invoice.timeZone}
          sentVia={invoice.sentVia}
        />
      )}

      {isOpenStatus && invoice.invoicesEnabled && (
        <SendReminderDialog
          invoiceId={invoice.id}
          customerEmail={invoice.customerEmail}
          isOverdue={invoice.isOverdue}
          dueDateYmd={invoice.dueDateYmd}
          disabled={capabilities.remindAvailableAt !== null}
          disabledReason={
            capabilities.remindAvailableAt
              ? `You can send another reminder after ${formatInstant(capabilities.remindAvailableAt, invoice.timeZone)}`
              : undefined
          }
        />
      )}

      {capabilities.canCancel && (
        <CancelInvoiceDialog
          invoiceId={invoice.id}
          amountPaidCents={invoice.amountPaidCents}
        />
      )}

      {canPrint && (
        <Button size="sm" variant="outline" asChild>
          <Link href={`/admin/invoices/${invoice.id}/print`}>
            <Printer className="h-4 w-4" />
            Print
          </Link>
        </Button>
      )}

      {invoice.viewUrl && <CopyLinkButton url={invoice.viewUrl} />}
    </div>
  );
}
