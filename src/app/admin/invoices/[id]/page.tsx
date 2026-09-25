import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { InvoiceDocument } from "~/components/invoices/invoice-document";

import { TrailHeader } from "../../_components/trail-header";
import { buildInvoiceDocumentProps } from "./_components/build-invoice-document-props";
import { formatInstant } from "./_components/format";
import { InvoiceActions } from "./_components/invoice-actions";
import { InvoiceActivity } from "./_components/invoice-activity";
import { InvoicePaymentsTable } from "./_components/invoice-payments-table";
import { NativeInvoiceStatusBadge } from "./_components/native-invoice-status-badge";

type Props = {
  params: Promise<{ id: string }>;
};

function sentViaLabel(sentVia: string | null): string {
  if (sentVia === "email") return "Emailed to customer";
  if (sentVia === "manual") return "Marked as sent (no email)";
  return "Not sent yet";
}

export default async function InvoiceDetailPage({ params }: Props) {
  const { id } = await params;

  // Not flag-gated: reading an invoice always works, even with `invoices`
  // turned off — the router's `invRead` tier (see `invoice.ts`) exists
  // specifically so turning the feature off never hides a money record.
  const [invoice, business] = await Promise.all([
    api.invoice.getById({ id }).catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);

  if (!invoice) notFound();

  const documentProps = buildInvoiceDocumentProps(invoice, business);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Invoices", href: "/admin/invoices" },
          { label: invoice.displayNumber },
        ]}
      />

      <div className="admin-form-toolbar">
        <div className="toolbar-info min-w-0">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-base font-medium">{invoice.displayNumber}</h1>
            <NativeInvoiceStatusBadge
              status={invoice.status}
              isOverdue={invoice.isOverdue}
            />
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {invoice.customerName}
            </span>
            {invoice.status !== "CANCELLED" && (
              <span className="text-sm font-medium">
                Balance due: {formatPrice(invoice.balanceCents)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="admin-container space-y-6">
        <InvoiceActions invoice={invoice} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left — the document preview */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden p-0">
              <CardContent className="p-8">
                <InvoiceDocument {...documentProps} />
              </CardContent>
            </Card>
          </div>

          {/* Right — payments, activity, meta */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoicePaymentsTable payments={invoice.payments} canDelete />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Sent via</span>
                  <span className="text-right font-medium">
                    {sentViaLabel(invoice.sentVia)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">First viewed</span>
                  <span className="text-right font-medium">
                    {invoice.firstViewedAt
                      ? formatInstant(invoice.firstViewedAt, invoice.timeZone)
                      : "Not yet viewed"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Last viewed</span>
                  <span className="text-right font-medium">
                    {invoice.lastViewedAt
                      ? formatInstant(invoice.lastViewedAt, invoice.timeZone)
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Reminders sent</span>
                  <span className="text-right font-medium">
                    {invoice.reminderCount > 0
                      ? `${invoice.reminderCount}${
                          invoice.lastReminderSentAt
                            ? ` (last ${formatInstant(invoice.lastReminderSentAt, invoice.timeZone)})`
                            : ""
                        }`
                      : "None"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <InvoiceActivity
                  events={invoice.events}
                  timeZone={invoice.timeZone}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const invoice = await api.invoice.getById({ id }).catch(() => null);
  return { title: invoice ? invoice.displayNumber : "Invoice" };
}
