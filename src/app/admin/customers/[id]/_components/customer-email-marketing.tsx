"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatDate } from "~/lib/format-date";
import { marketingConsentSourceLabel } from "~/lib/marketing/consent";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import {
  consentEventLabel,
  getImportedHint,
  getMarketingStatus,
} from "../../_components/marketing-status";

type Props = {
  customerId: string;
  /** Name, or email when the customer has no name. */
  displayName: string;
  acceptsMarketing: boolean;
  marketingConsentAt: Date | null;
  marketingConsentSource: string | null;
  marketingUnsubscribedAt: Date | null;
  marketingSuppressedAt: Date | null;
  marketingSuppressionReason: string | null;
  /** Set when the customer came in through a contact import. */
  importId?: string | null;
  importStatus?: string | null;
  /** `customer.markUnsubscribed` is owner/manager-tier; Staff see read-only. */
  canManage: boolean;
  anonymized: boolean;
};

const EVENTS_SHOWN = 10;

export function CustomerEmailMarketing({
  customerId,
  displayName,
  acceptsMarketing,
  marketingConsentAt,
  marketingConsentSource,
  marketingUnsubscribedAt,
  marketingSuppressedAt,
  marketingSuppressionReason,
  importId,
  importStatus,
  canManage,
  anonymized,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);

  const status = getMarketingStatus({
    acceptsMarketing,
    marketingUnsubscribedAt,
    marketingSuppressedAt,
    marketingSuppressionReason,
  });

  const importedHint = getImportedHint({
    importId,
    importStatus,
    acceptsMarketing,
    marketingUnsubscribedAt,
  });

  const events = api.customer.listConsentEvents.useQuery({
    customerId,
    limit: EVENTS_SHOWN,
  });

  const unsubscribe = api.customer.markUnsubscribed.useMutation({
    onSuccess: () => {
      toast.success(`${displayName} will no longer get marketing emails.`);
      void utils.customer.listConsentEvents.invalidate({ customerId });
      void utils.customer.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't unsubscribe this customer.");
    },
  });

  const sourceLabel = marketingConsentSourceLabel(marketingConsentSource);
  const canUnsubscribe =
    canManage && !anonymized && status.kind === "subscribed";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Email marketing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              {importedHint && <Badge variant="outline">{importedHint}</Badge>}
            </div>
            {importedHint && !marketingUnsubscribedAt && (
              <p className="text-muted-foreground mt-2 text-sm">
                Brought over from your previous site. They only join your email
                list if they choose to in the invite email.
              </p>
            )}
            {status.kind === "suppressed" && (
              <p className="text-muted-foreground mt-2 text-sm">
                We&apos;ve stopped sending marketing emails to this address
                because the email provider reported a problem with it. Order
                emails like receipts are not affected.
              </p>
            )}
          </div>

          <dl className="space-y-3 text-sm">
            {marketingConsentAt && (
              <div>
                <dt className="text-muted-foreground">Joined the list</dt>
                <dd className="font-medium">
                  {sourceLabel ? `${sourceLabel} · ` : ""}
                  {formatDate(marketingConsentAt)}
                </dd>
              </div>
            )}
            {marketingUnsubscribedAt && (
              <div>
                <dt className="text-muted-foreground">Unsubscribed</dt>
                <dd className="font-medium">
                  {formatDate(marketingUnsubscribedAt)}
                </dd>
              </div>
            )}
            {marketingSuppressedAt && (
              <div>
                <dt className="text-muted-foreground">Emails stopped</dt>
                <dd className="font-medium">
                  {formatDate(marketingSuppressedAt)}
                </dd>
              </div>
            )}
          </dl>

          {canUnsubscribe && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(true)}
              disabled={unsubscribe.isPending}
            >
              Mark as unsubscribed
            </Button>
          )}

          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">Recent activity</h3>
            {events.isPending ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : events.isError ? (
              <p className="text-muted-foreground text-sm">
                Couldn&apos;t load activity. Try refreshing the page.
              </p>
            ) : events.data.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No activity recorded yet. Changes to this customer&apos;s email
                preferences will show up here.
              </p>
            ) : (
              <ul className="space-y-3">
                {events.data.slice(0, EVENTS_SHOWN).map((event) => (
                  <li key={event.id} className="text-sm">
                    <p className="font-medium">{consentEventLabel(event)}</p>
                    {event.campaignSubject && (
                      <p className="text-muted-foreground">
                        From the email &ldquo;{event.campaignSubject}&rdquo;
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {formatDate(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {canUnsubscribe && (
        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as unsubscribed?</AlertDialogTitle>
              <AlertDialogDescription>
                Stop sending marketing emails to {displayName}? Use this when
                someone asks you by reply, phone or in person. They can
                resubscribe themselves later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={unsubscribe.isPending}
                onClick={() => {
                  setDialogOpen(false);
                  unsubscribe.mutate({ customerId });
                }}
              >
                {unsubscribe.isPending
                  ? "Unsubscribing…"
                  : "Mark as unsubscribed"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
