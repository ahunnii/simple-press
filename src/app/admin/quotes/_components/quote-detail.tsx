"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type {
  QuoteFormulaSnapshot,
  QuoteStatusDb,
  QuoteSubmissionAnswer,
} from "~/lib/validators/quote-calculator";
import { formatDate } from "~/lib/format-date";
import {
  centsToDollarsString,
  dollarsToCents,
  formatPrice,
} from "~/lib/prices";
import { cn } from "~/lib/utils";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_VALUES_DB,
} from "~/lib/validators/quote-calculator";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

import { AdminFormMoreMenu } from "../../_components/admin-form-more-menu";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";

export type QuoteDetailSubmission = {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  calculatorName: string;
  calculatorId: string | null;
  estimateCents: number | null;
  finalQuoteCents: number | null;
  quoteSentAt: Date | null;
  sentQuoteCents: number | null;
  sentMessage: string | null;
  showEstimateToCustomer: boolean;
  status: QuoteStatusDb;
  createdAt: Date;
};

type Props = {
  submission: QuoteDetailSubmission;
  /** Definition-ordered snapshot rows, or `[]` if the stored JSON no longer
   *  parses against the schema (see `answersParseFailed`). */
  answers: QuoteSubmissionAnswer[];
  answersParseFailed: boolean;
  formulaSnapshot: QuoteFormulaSnapshot | null;
  formulaParseFailed: boolean;
  /** Mirrors `quoteSubmission.bulkDelete`'s `ownerOnlyProcedure`, resolved
   *  server-side. False OMITS the Delete menu item rather than disabling it. */
  canDelete: boolean;
};

const BASE_PATH = "/admin/quotes";

export function QuoteDetail({
  submission,
  answers,
  answersParseFailed,
  formulaSnapshot,
  formulaParseFailed,
  canDelete,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  // Dollars-string draft for the final amount, seeded from the saved
  // adjustment (or the computed estimate when none exists yet). Message is
  // seeded from the last-sent message so a resend starts from what the
  // customer already saw.
  const [amountInput, setAmountInput] = useState(() =>
    centsToDollarsString(
      submission.finalQuoteCents ?? submission.estimateCents,
    ),
  );
  const [message, setMessage] = useState(submission.sentMessage ?? "");

  const amountTrimmed = amountInput.trim();
  const amountNumber = Number.parseFloat(amountTrimmed);
  const amountValid =
    amountTrimmed !== "" && Number.isFinite(amountNumber) && amountNumber >= 0;
  const amountCents = amountValid ? dollarsToCents(amountTrimmed) : null;
  const canSend = amountValid && message.trim() !== "";

  const afterWrite = () => {
    void utils.quoteSubmission.invalidate();
    router.refresh();
  };

  // Bound directly to `submission.status` (an RSC prop), not local state —
  // no optimistic update (docs/admin-table-migration.md §2). The Select
  // shows the prior value until `afterWrite`'s `router.refresh()` brings a
  // fresh prop down, same as the role Select in
  // settings/team/_components/team-members.tsx.
  const updateStatusMutation = api.quoteSubmission.updateStatus.useMutation({
    onMutate: loadingToast("Updating status…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(`Marked ${QUOTE_STATUS_LABELS[variables.status]}`);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to update status");
    },
  });

  // No singular `quoteSubmission.delete` procedure exists — the router only
  // offers `bulkDelete`, so a single-row delete is a bulk call with a
  // one-element `ids` array. `bulkDelete` is `ownerOnlyProcedure`, hence
  // `canDelete` (resolved server-side, same membershipRole check the list
  // page's `canBulkDelete` uses) gating whether the menu item renders.
  const deleteMutation = api.quoteSubmission.bulkDelete.useMutation({
    onMutate: loadingToast("Deleting quote…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      if (data.count > 0) {
        toast.success("Quote deleted");
      } else {
        // Already gone — another tab/admin got there first.
        toast.warning("This quote was already deleted");
      }
      void utils.quoteSubmission.invalidate();
      router.push(BASE_PATH);
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete quote");
      setDeleteOpen(false);
    },
  });

  const handleStatusChange = (value: string) => {
    updateStatusMutation.mutate({
      id: submission.id,
      status: value as QuoteStatusDb,
    });
  };

  const setFinalQuoteMutation = api.quoteSubmission.setFinalQuote.useMutation({
    onMutate: loadingToast("Saving final quote…"),
    onSuccess: (_data, variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        variables.finalQuoteCents == null
          ? "Adjustment cleared — using the computed estimate"
          : `Final quote saved: ${formatPrice(variables.finalQuoteCents)}`,
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to save the final quote");
    },
  });

  const sendFinalQuoteMutation = api.quoteSubmission.sendFinalQuote.useMutation(
    {
      onMutate: loadingToast("Sending quote…"),
      onSuccess: (_data, variables, context) => {
        dismissLoadingToast(context);
        toast.success(
          `Quote of ${formatPrice(variables.finalQuoteCents)} sent to ${submission.contactEmail}`,
        );
        setSendOpen(false);
        afterWrite();
      },
      onError: (error, _variables, context) => {
        dismissLoadingToast(context);
        toast.error(error.message ?? "Failed to send the quote");
        setSendOpen(false);
      },
    },
  );

  const handleSaveAmount = () => {
    setFinalQuoteMutation.mutate({
      id: submission.id,
      // A cleared input intentionally maps to null = "use the estimate".
      finalQuoteCents: amountTrimmed === "" ? null : amountCents,
    });
  };

  const handleSend = () => {
    if (amountCents == null) return;
    sendFinalQuoteMutation.mutate({
      id: submission.id,
      finalQuoteCents: amountCents,
      message: message.trim(),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate({ ids: [submission.id] });
  };

  const estimateLabel =
    submission.estimateCents != null
      ? formatPrice(submission.estimateCents)
      : "—";

  return (
    <>
      <div className="admin-form-toolbar">
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href={BASE_PATH}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="truncate text-base font-medium">
              {submission.contactName}
            </h1>
          </div>
        </div>

        <div className="toolbar-actions">
          <div className="flex shrink-0 items-center gap-2">
            <Label htmlFor="quote-status" className="sr-only">
              Status
            </Label>
            <Select
              value={submission.status}
              onValueChange={handleStatusChange}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger id="quote-status" className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_STATUS_VALUES_DB.map((value) => (
                  <SelectItem key={value} value={value}>
                    {QUOTE_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdminFormMoreMenu
            items={
              canDelete
                ? [
                    {
                      label: "Delete quote",
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => setDeleteOpen(true),
                    },
                  ]
                : []
            }
          />
        </div>
      </div>

      <div className="admin-container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left — answers + formula */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Answers</CardTitle>
                {answersParseFailed && (
                  <CardDescription>
                    This quote&apos;s answer data couldn&apos;t be read.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {answers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No answers recorded.
                  </p>
                ) : (
                  <dl className="divide-y">
                    {answers.map((answer, index) => (
                      <div
                        key={`${answer.questionId}-${index}`}
                        className={cn(
                          "grid grid-cols-1 gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-3 sm:gap-4",
                          answer.hidden && "opacity-50",
                        )}
                      >
                        <dt className="text-sm font-medium">{answer.title}</dt>
                        <dd className="text-muted-foreground text-sm sm:col-span-2">
                          {answer.display}
                          {answer.hidden && (
                            <span className="ml-2 text-xs italic">
                              not shown — skipped by branching
                            </span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Formula snapshot</CardTitle>
                <CardDescription>
                  Values captured at submission time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {formulaSnapshot ? (
                  <>
                    <code className="bg-muted block overflow-x-auto rounded-md p-3 text-sm">
                      {formulaSnapshot.formula}
                    </code>
                    {Object.keys(formulaSnapshot.variables).length > 0 && (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {Object.entries(formulaSnapshot.variables).map(
                          ([name, value]) => (
                            <div key={name} className="contents">
                              <span className="text-muted-foreground truncate">
                                {name}
                              </span>
                              <span className="text-right tabular-nums">
                                {value}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {formulaParseFailed
                      ? "This quote's formula snapshot couldn't be read."
                      : "No formula snapshot recorded."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — contact + estimate */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-muted-foreground text-sm">Name</p>
                  <p className="font-medium">{submission.contactName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Email</p>
                  <a
                    href={`mailto:${submission.contactEmail}`}
                    className="font-medium hover:underline"
                  >
                    {submission.contactEmail}
                  </a>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Phone</p>
                  {submission.contactPhone ? (
                    <a
                      href={`tel:${submission.contactPhone}`}
                      className="font-medium hover:underline"
                    >
                      {submission.contactPhone}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">—</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Received</p>
                  <p className="font-medium">
                    {formatDate(submission.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Calculator</p>
                  {submission.calculatorId ? (
                    <Link
                      href={`${BASE_PATH}/calculators/${submission.calculatorId}`}
                      className="font-medium hover:underline"
                    >
                      {submission.calculatorName}
                    </Link>
                  ) : (
                    <>
                      <p className="font-medium">{submission.calculatorName}</p>
                      <p className="text-muted-foreground text-xs">
                        (calculator deleted)
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Computed estimate</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-3xl font-bold tabular-nums">
                  {estimateLabel}
                </p>
                <p className="text-muted-foreground text-sm">
                  Customer saw:{" "}
                  {submission.showEstimateToCustomer
                    ? "the estimate"
                    : "estimate hidden (thank-you message only)"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Final quote</CardTitle>
                <CardDescription>
                  Review the numbers, adjust if needed, and email the customer
                  your quote. Replies go straight to your inbox.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="final-quote-amount">Amount</Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">
                      $
                    </span>
                    <Input
                      id="final-quote-amount"
                      inputMode="decimal"
                      className="pl-7 tabular-nums"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      aria-invalid={amountTrimmed !== "" && !amountValid}
                    />
                  </div>
                  {amountTrimmed !== "" && !amountValid && (
                    <p className="text-destructive text-xs">
                      Enter a valid amount.
                    </p>
                  )}
                  {submission.finalQuoteCents != null &&
                    submission.estimateCents != null &&
                    submission.finalQuoteCents !== submission.estimateCents && (
                      <p className="text-muted-foreground text-xs">
                        Adjusted from the computed estimate.
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final-quote-message">
                    Message to the customer
                  </Label>
                  <Textarea
                    id="final-quote-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder="Thanks for the details! Here's your quote — reply to this email with any questions or to get scheduled."
                  />
                </div>

                {submission.quoteSentAt && (
                  <p className="text-muted-foreground text-sm">
                    Sent {formatDate(submission.quoteSentAt)}
                    {submission.sentQuoteCents != null
                      ? ` — ${formatPrice(submission.sentQuoteCents)}`
                      : ""}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => setSendOpen(true)}
                    disabled={!canSend || sendFinalQuoteMutation.isPending}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {submission.quoteSentAt ? "Resend quote" : "Send quote"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSaveAmount}
                    disabled={
                      (amountTrimmed !== "" && !amountValid) ||
                      setFinalQuoteMutation.isPending
                    }
                  >
                    Save amount
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={sendOpen} onOpenChange={setSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Send this quote to {submission.contactEmail}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The customer will receive an email with your message and a quote
              of {amountCents != null ? formatPrice(amountCents) : "—"}. Replies
              go to your business email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendFinalQuoteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={sendFinalQuoteMutation.isPending}
            >
              {sendFinalQuoteMutation.isPending ? "Sending…" : "Send quote"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{submission.contactName}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this quote&apos;s contact info,
              answers and estimate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
