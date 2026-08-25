"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import type { QuoteDetailSubmission } from "./quote-detail";
import type { InvoiceFormDefaults } from "~/app/admin/invoices/_components/invoice-form-dialog";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { formatPrice } from "~/lib/prices";
import { qboInvoiceUrl } from "~/lib/quickbooks/constants";
import {
  computeDepositCents,
  computeFinalPrefillCents,
} from "~/lib/quickbooks/mapping";
import { cn } from "~/lib/utils";
import { QBO_INVOICE_KIND_LABELS } from "~/lib/validators/quickbooks";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { InvoiceFormDialog } from "~/app/admin/invoices/_components/invoice-form-dialog";
import { InvoiceStatusBadge } from "~/app/admin/invoices/_components/invoice-status-badge";

/**
 * Everything this card needs, resolved server-side in `../[id]/page.tsx` —
 * and ONLY when the `quickbooks` feature flag is on. With the flag off the
 * page passes no `quickbooks` prop at all, so this component never mounts and
 * neither `quickbooks.getConnection` nor `quickbooks.getLeadInvoices` is
 * called.
 */
export type QuoteQuickBooksCardData = {
  connection: RouterOutputs["quickbooks"]["getConnection"];
  invoices: RouterOutputs["quickbooks"]["getLeadInvoices"];
};

type Props = {
  data: QuoteQuickBooksCardData;
  submission: QuoteDetailSubmission;
  /** The detail page's `afterWrite` — invalidate the tRPC cache + refresh. */
  onChanged: () => void;
};

const INTEGRATIONS_HREF = "/admin/settings/integrations";

/**
 * Invoice statuses that do NOT count as a live invoice: `pending` never
 * reached QuickBooks, `error` failed on the way there, and `voided` was
 * cancelled afterwards. Deliberately the same exclusion set
 * `computeFinalPrefillCents` applies to deposits, so "already sent" and
 * "already deducted from the balance" can never disagree.
 */
const DEAD_INVOICE_STATUSES = ["error", "voided", "pending"];

function isLive(invoice: { status: string }): boolean {
  return !DEAD_INVOICE_STATUSES.includes(invoice.status);
}

/**
 * `kind` is a plain `String` column (Prisma has no enum for it), so it arrives
 * typed as `string` and cannot index the label Record directly. Widening the
 * Record to a `string` key keeps the lookup total, falling back to the raw
 * value rather than rendering `undefined` for a kind we don't know yet.
 */
function kindLabel(kind: string): string {
  const labels: Record<string, string | undefined> = QBO_INVOICE_KIND_LABELS;
  return labels[kind] ?? kind;
}

export function QuoteQuickBooksCard({ data, submission, onChanged }: Props) {
  const { connection: account, invoices } = data;
  const connection = account.connection;

  // What a deposit is a percentage OF: the owner's adjustment when one exists,
  // otherwise the calculator's computed estimate.
  const quoteCents = submission.finalQuoteCents ?? submission.estimateCents;

  // `depositMode` is a `String` column; narrowed here rather than cast, with
  // "percent" (the schema default) as the fallback for anything unexpected.
  const depositMode = connection?.depositMode === "fixed" ? "fixed" : "percent";
  const depositPercent = connection?.depositPercent ?? 0;
  const depositFixedCents = connection?.depositFixedCents ?? 0;

  const depositPrefill = computeDepositCents(
    { depositMode, depositPercent, depositFixedCents },
    quoteCents,
  );
  const finalPrefill = computeFinalPrefillCents(
    submission.finalQuoteCents,
    invoices,
  );

  const hasLiveDeposit = invoices.some(
    (invoice) => invoice.kind === "deposit" && isLive(invoice),
  );
  const hasLiveFinal = invoices.some(
    (invoice) => invoice.kind === "final" && isLive(invoice),
  );

  const contactDefaults = {
    customerName: submission.contactName,
    customerEmail: submission.contactEmail,
    customerPhone: submission.contactPhone ?? "",
  };

  // One dialog, re-seeded per launch. `open` and `defaults` move together so a
  // re-open can never flash the previous kind's prefill.
  const [dialog, setDialog] = useState<{
    open: boolean;
    defaults: InvoiceFormDefaults;
  }>(() => ({
    open: false,
    defaults: { kind: "deposit", amountCents: null, ...contactDefaults },
  }));

  const openDialog = (
    kind: "deposit" | "final",
    amountCents: number | null,
  ) => {
    setDialog({
      open: true,
      defaults: { kind, amountCents, ...contactDefaults },
    });
  };

  const depositDisabled = quoteCents == null;
  const finalHint =
    submission.finalQuoteCents == null
      ? "Set a final quote first"
      : hasLiveFinal
        ? "Final invoice already sent"
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>QuickBooks invoices</CardTitle>
        <CardDescription>
          Collect a deposit now and bill the balance after the job. Invoices are
          created and emailed by QuickBooks.
        </CardDescription>
      </CardHeader>

      {connection?.status !== "active" ? (
        <CardContent>
          {connection == null ? (
            <p className="text-muted-foreground text-sm">
              Connect QuickBooks in{" "}
              <Link
                href={INTEGRATIONS_HREF}
                className="text-foreground font-medium hover:underline"
              >
                Settings → Integrations
              </Link>{" "}
              to send invoices.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              QuickBooks needs to be reconnected before invoices can be sent.{" "}
              <Link
                href={INTEGRATIONS_HREF}
                className="text-foreground font-medium hover:underline"
              >
                Settings → Integrations
              </Link>
            </p>
          )}
        </CardContent>
      ) : (
        <CardContent className="space-y-4">
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No invoices yet for this lead.
            </p>
          ) : (
            // Already newest-first — `quickbooks.getLeadInvoices` orders by
            // `createdAt desc`, so transport order is display order.
            <ul className="divide-y">
              {invoices.map((invoice) => {
                const balanceNote =
                  typeof invoice.balanceCents === "number" &&
                  invoice.balanceCents > 0 &&
                  invoice.status !== "paid"
                    ? `Balance ${formatPrice(invoice.balanceCents)}`
                    : null;

                return (
                  <li
                    key={invoice.id}
                    className={cn(
                      "space-y-1 py-3 first:pt-0 last:pb-0",
                      !isLive(invoice) && "opacity-60",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{kindLabel(invoice.kind)}</Badge>
                      <span className="text-sm font-medium tabular-nums">
                        {formatPrice(invoice.amountCents)}
                      </span>
                      <InvoiceStatusBadge status={invoice.status} />
                    </div>

                    <p className="text-muted-foreground text-xs">
                      {formatDate(invoice.createdAt)}
                      {balanceNote ? ` · ${balanceNote}` : ""}
                    </p>

                    {invoice.lastError && (
                      <p className="text-destructive text-xs">
                        {invoice.lastError}
                      </p>
                    )}

                    {invoice.qboInvoiceId && (
                      <a
                        href={qboInvoiceUrl(
                          account.environment,
                          invoice.qboInvoiceId,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs hover:underline"
                      >
                        Open in QuickBooks
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={depositDisabled}
                onClick={() => openDialog("deposit", depositPrefill)}
              >
                {hasLiveDeposit
                  ? "Send another deposit"
                  : "Send deposit invoice"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={finalHint !== null}
                onClick={() => openDialog("final", finalPrefill)}
              >
                Send final invoice
              </Button>
            </div>

            {depositDisabled && (
              <p className="text-muted-foreground text-xs">
                Set a final quote or estimate first
              </p>
            )}
            {finalHint && (
              <p className="text-muted-foreground text-xs">{finalHint}</p>
            )}

            {quoteCents != null && (
              <p className="text-muted-foreground text-xs">
                {`Deposit default: ${
                  depositMode === "percent"
                    ? `${depositPercent}% of the quote`
                    : formatPrice(depositFixedCents)
                } · Final prefill = final quote − deposits`}
              </p>
            )}
          </div>

          <InvoiceFormDialog
            open={dialog.open}
            onOpenChange={(open: boolean) =>
              setDialog((prev) => ({ ...prev, open }))
            }
            defaults={dialog.defaults}
            quoteSubmissionId={submission.id}
            defaultDueDays={connection.defaultDueDays}
            timeZone={account.timeZone}
            lockKind
            onCreated={onChanged}
          />
        </CardContent>
      )}
    </Card>
  );
}
