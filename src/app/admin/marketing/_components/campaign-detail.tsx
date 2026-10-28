"use client";

import type { JSONContent } from "@tiptap/core";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarClock,
  CalendarX2,
  Copy,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import {
  ACTIVE_CAMPAIGN_STATUSES,
  CAMPAIGN_RECIPIENT_STATUS_LABELS,
  CAMPAIGN_RECIPIENT_STATUSES,
} from "~/lib/marketing/campaign-status";
import { describeAudience } from "~/lib/marketing/segments";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
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
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { formatCampaignInstant, pluralize } from "../_lib/format";
import { AdminEmpty } from "../../_components/admin-empty";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import {
  CampaignStatusBadge,
  RecipientStatusBadge,
} from "./campaign-status-badge";
import { EmailBodyPreview } from "./email-body-preview";
import { EmailPreviewFrame, useCampaignPreview } from "./email-preview-frame";

type Campaign = RouterOutputs["marketing"]["getCampaign"];
type RecipientStatus = (typeof CAMPAIGN_RECIPIENT_STATUSES)[number];

const LIST_PATH = "/admin/marketing";

function isActive(status: string) {
  return (ACTIVE_CAMPAIGN_STATUSES as readonly string[]).includes(status);
}

/** "Sent Sep 24, 2026, 3:05 PM" style line for the header. */
function dateLine(campaign: Campaign, timeZone: string): string | null {
  const fmt = (d: Date) => formatCampaignInstant(d, timeZone);
  switch (campaign.status) {
    case "QUEUED":
    case "SENDING":
      return campaign.queuedAt ? `Queued ${fmt(campaign.queuedAt)}` : null;
    case "SENT": {
      const at = campaign.completedAt ?? campaign.queuedAt;
      return at ? `Sent ${fmt(at)}` : null;
    }
    case "FAILED": {
      const at = campaign.completedAt ?? campaign.queuedAt;
      return at ? `Failed ${fmt(at)}` : null;
    }
    case "SCHEDULED":
      return campaign.scheduledAt
        ? `Scheduled for ${fmt(campaign.scheduledAt)}`
        : null;
    case "CANCELED":
      return campaign.canceledAt
        ? `Canceled ${fmt(campaign.canceledAt)}`
        : null;
    default:
      return null;
  }
}

type Props = {
  initialCampaign: Campaign;
  timeZone: string;
  /** False when the emailMarketing flag is off: Duplicate / Edit are hidden. */
  emailMarketingEnabled?: boolean;
};

/** How long before a scheduled time the page starts watching for the send. */
const SCHEDULE_WATCH_MS = 30 * 60_000;

export function CampaignDetail({
  initialCampaign,
  timeZone,
  emailMarketingEnabled = true,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const id = initialCampaign.id;

  const { data } = api.marketing.getCampaign.useQuery(
    { id },
    {
      initialData: initialCampaign,
      // Poll only while the sender still has work; the cron/worker moves the
      // status on, and a finished campaign never changes by itself. A
      // scheduled one is watched (slowly) once it is nearly due.
      refetchInterval: (query) => {
        const current = query.state.data;
        if (!current) return false;
        if (isActive(current.status)) return 3000;
        if (
          current.status === "SCHEDULED" &&
          current.scheduledAt &&
          new Date(current.scheduledAt).getTime() - Date.now() <
            SCHEDULE_WATCH_MS
        ) {
          return 15_000;
        }
        return false;
      },
    },
  );
  const campaign = data;
  const active = isActive(campaign.status);
  const { counts, batches } = campaign;
  const storedDoc =
    campaign.bodyJson &&
    typeof campaign.bodyJson === "object" &&
    (campaign.bodyJson as { type?: unknown }).type === "doc"
      ? (campaign.bodyJson as JSONContent)
      : null;

  // Refresh the recipient table once when the campaign leaves an active state.
  const previousStatus = useRef(campaign.status);
  useEffect(() => {
    if (previousStatus.current !== campaign.status) {
      previousStatus.current = campaign.status;
      void utils.marketing.listCampaignRecipients.invalidate();
    }
  }, [campaign.status, utils]);

  const [cancelOpen, setCancelOpen] = useState(false);
  const cancelCampaign = api.marketing.cancelCampaign.useMutation({
    onSuccess: async () => {
      toast.success(
        "Campaign canceled. Emails already sent can't be recalled.",
      );
      setCancelOpen(false);
      await Promise.all([
        utils.marketing.getCampaign.invalidate({ id }),
        utils.marketing.listCampaigns.invalidate(),
      ]);
      router.refresh();
    },
    onError: (error) => {
      setCancelOpen(false);
      toast.error(error.message || "Failed to cancel campaign");
    },
  });

  const [editOpen, setEditOpen] = useState(false);
  // Unscheduling returns the campaign to a draft, which the server page opens
  // in the composer, so a refresh is all the "edit" navigation needed. The
  // refresh runs in a transition: until the composer arrives, `returning`
  // keeps the scheduled view on screen (buttons disabled) instead of letting
  // the page flash the sent-campaign layout for a draft.
  const [refreshing, startRefresh] = useTransition();
  const unschedule = api.marketing.unscheduleCampaign.useMutation({
    onSuccess: () => {
      toast.success("Unscheduled. It's back in your drafts.");
      setEditOpen(false);
      void utils.marketing.listCampaigns.invalidate();
      startRefresh(() => router.refresh());
    },
    onError: async (error) => {
      setEditOpen(false);
      toast.error(error.message || "Couldn't unschedule the campaign");
      // Most likely it already started sending: show where it really is.
      await utils.marketing.getCampaign.invalidate({ id });
      router.refresh();
    },
  });
  const returning =
    unschedule.isPending || refreshing || campaign.status === "DRAFT";
  const scheduled = campaign.status === "SCHEDULED" || returning;
  // The one-time invite sent after a contact import: fixed content, never
  // duplicated (the server refuses it too).
  const isInvite = campaign.kind === "REPERMISSION";

  const duplicate = api.marketing.duplicateCampaign.useMutation({
    onSuccess: ({ id: newId }) => {
      toast.success("Copied to a new draft");
      void utils.marketing.listCampaigns.invalidate();
      router.push(`${LIST_PATH}/campaigns/${newId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't duplicate the campaign");
    },
  });

  const delivered = counts.byStatus.DELIVERED + counts.byStatus.COMPLAINED;
  const waiting = counts.byStatus.PENDING + counts.byStatus.SENDING;

  // Always-visible tiles, then the ones that only matter when non-zero.
  const tiles: { label: string; value: number }[] = [
    { label: "Recipients", value: campaign.recipientCount },
    { label: "Accepted", value: counts.accepted },
    { label: "Delivered", value: delivered },
    { label: "Bounced", value: counts.byStatus.BOUNCED },
    { label: "Marked as spam", value: counts.byStatus.COMPLAINED },
    { label: "Unsubscribed", value: counts.unsubscribed },
  ];
  const optionalTiles: { label: string; value: number }[] = [
    { label: "Waiting to send", value: waiting },
    { label: "Failed", value: counts.byStatus.FAILED },
    { label: "Skipped", value: counts.byStatus.SKIPPED },
    { label: "Canceled", value: counts.byStatus.CANCELED },
  ].filter((t) => t.value > 0);

  const batchesDone = batches.sent + batches.failed + batches.canceled;
  const percent =
    batches.total > 0 ? Math.round((batchesDone / batches.total) * 100) : 0;
  const date = dateLine(campaign, timeZone);
  const audienceLabel = describeAudience(
    campaign.audience,
    campaign.audienceProductNames,
  );

  return (
    <>
      <div className="admin-form-toolbar">
        <div className="toolbar-info min-w-0">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href={LIST_PATH}>
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="truncate text-base font-medium">
              {campaign.subject}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
            {isInvite && <Badge variant="outline">Invite</Badge>}
            {date && (
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {date}
                {campaign.createdByName
                  ? ` · by ${campaign.createdByName}`
                  : ""}
              </span>
            )}
          </div>
        </div>
        <div className="toolbar-actions">
          {emailMarketingEnabled && !isInvite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => duplicate.mutate({ id })}
              disabled={duplicate.isPending}
            >
              {duplicate.isPending ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Duplicate
            </Button>
          )}
          {scheduled && (
            // One action: unscheduling is what makes a scheduled campaign
            // editable, and it stays available with email marketing off
            // (unschedule is ungated).
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
              disabled={returning}
            >
              {returning ? (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <CalendarX2 className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Unschedule to edit
            </Button>
          )}
          {active && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              disabled={cancelCampaign.isPending}
            >
              <Ban className="mr-2 h-4 w-4" aria-hidden="true" />
              Cancel campaign
            </Button>
          )}
        </div>
      </div>

      <div className="admin-container space-y-6">
        {date && (
          <p className="text-muted-foreground text-sm sm:hidden">
            {date}
            {campaign.createdByName ? ` · by ${campaign.createdByName}` : ""}
          </p>
        )}

        {campaign.lastError &&
          (scheduled ? (
            // Still scheduled: the sweep hit a hiccup and will try again.
            <Alert variant="warning">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>We hit a problem sending this</AlertTitle>
              <AlertDescription>{campaign.lastError}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Something went wrong while sending</AlertTitle>
              <AlertDescription>{campaign.lastError}</AlertDescription>
            </Alert>
          ))}

        {active && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Loader2
                  className="text-muted-foreground h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                {campaign.status === "QUEUED" ? "Waiting to start" : "Sending"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress
                value={percent}
                aria-label="Campaign sending progress"
              />
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {batches.total > 0
                  ? `${batchesDone.toLocaleString()} of ${batches.total.toLocaleString()} ${pluralize(batches.total, "batch", "batches")} sent (${percent}%). Emails go out in batches over a few minutes; this page updates on its own.`
                  : "Getting ready to send. This page updates on its own."}
              </p>
            </CardContent>
          </Card>
        )}

        {scheduled && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <CalendarClock
                  className="text-muted-foreground h-4 w-4"
                  aria-hidden="true"
                />
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {campaign.scheduledAt && (
                <p>
                  Goes out within about 15 minutes of{" "}
                  <span className="font-medium">
                    {formatCampaignInstant(campaign.scheduledAt, timeZone)}
                  </span>
                  .
                </p>
              )}
              <p className="text-muted-foreground">
                Audience: {audienceLabel}. Who is included is worked out when it
                sends, so the number of recipients can change before then.
                It&apos;s locked while scheduled; unschedule it to make changes.
              </p>
              {returning && (
                <p className="text-muted-foreground" aria-live="polite">
                  Moving it back to your drafts…
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!scheduled && (
          <section aria-label="Results">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[...tiles, ...optionalTiles].map((tile) => (
                <Card key={tile.label} className="gap-1 py-4">
                  <CardContent className="px-4">
                    <dt className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      {tile.label}
                    </dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">
                      {tile.value.toLocaleString()}
                    </dd>
                  </CardContent>
                </Card>
              ))}
            </dl>
          </section>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Email content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Subject
              </div>
              <p className="mt-1 font-medium">{campaign.subject}</p>
            </div>
            {campaign.previewText && (
              <div>
                <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Preview text
                </div>
                <p className="mt-1">{campaign.previewText}</p>
              </div>
            )}
            <div>
              <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Audience
              </div>
              <p className="mt-1">{audienceLabel}</p>
            </div>
            <div>
              <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Message
              </div>
              {campaign.contentFormat === "tiptap" && storedDoc ? (
                <div className="mt-2">
                  {scheduled && emailMarketingEnabled ? (
                    // It sends with the style and products as they are at the
                    // scheduled time, so show the full email as it'd go out
                    // now, not just the stored body.
                    <ScheduledEmailPreview
                      doc={storedDoc}
                      previewText={campaign.previewText}
                    />
                  ) : (
                    // Frozen content; `baseUrl` resolves relative photos and
                    // links (the frozen one, else the store's current URL).
                    <EmailBodyPreview
                      doc={storedDoc}
                      baseUrl={campaign.baseUrl}
                    />
                  )}
                </div>
              ) : campaign.bodyText ? (
                <p className="mt-1 leading-relaxed whitespace-pre-wrap">
                  {campaign.bodyText}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1">
                  Rich-text message. Open the sent email to view it.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {!scheduled && (
          <RecipientsSection campaignId={id} timeZone={timeZone} />
        )}
      </div>

      <AlertDialog open={editOpen} onOpenChange={setEditOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unschedule to edit?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the campaign back to your drafts so you can change it.
              Schedule it again when you&apos;re ready.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unschedule.isPending}>
              Keep scheduled
            </AlertDialogCancel>
            <Button
              onClick={() => unschedule.mutate({ id })}
              disabled={unschedule.isPending}
            >
              {unschedule.isPending && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Unschedule
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Sending stops right away for everyone who hasn&apos;t been emailed
              yet. Emails that have already gone out can&apos;t be recalled, and
              a canceled campaign can&apos;t be restarted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelCampaign.isPending}>
              Keep sending
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => cancelCampaign.mutate({ id })}
              disabled={cancelCampaign.isPending}
            >
              {cancelCampaign.isPending && (
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              )}
              Cancel campaign
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * The full email (header, style, products, footer) as it would send right
 * now, for a scheduled campaign: it is rendered at the scheduled time with
 * the style and products current then, so the stored body alone would mislead.
 */
function ScheduledEmailPreview({
  doc,
  previewText,
}: {
  doc: JSONContent;
  previewText: string | null;
}) {
  const preview = useCampaignPreview({
    bodyJson: doc,
    previewText: previewText ?? undefined,
  });
  return (
    <div className="space-y-2">
      <EmailPreviewFrame html={preview.html} loading={preview.loading} />
      {preview.error && (
        <p className="text-destructive text-xs" role="alert">
          {preview.error}
        </p>
      )}
    </div>
  );
}

function RecipientsSection({
  campaignId,
  timeZone,
}: {
  campaignId: string;
  timeZone: string;
}) {
  const [status, setStatus] = useState<RecipientStatus | "all">("all");

  const query = api.marketing.listCampaignRecipients.useInfiniteQuery(
    {
      id: campaignId,
      status: status === "all" ? undefined : status,
      limit: 50,
    },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );
  const recipients = query.data?.pages.flatMap((p) => p.recipients) ?? [];

  return (
    <section aria-labelledby="recipients-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2
          id="recipients-heading"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Users className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          Recipients
        </h2>
        <div className="flex items-center gap-2">
          <Label htmlFor="recipient-status-filter" className="text-sm">
            Status
          </Label>
          <Select
            value={status}
            onValueChange={(value) =>
              setStatus(value as RecipientStatus | "all")
            }
          >
            <SelectTrigger id="recipient-status-filter" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {CAMPAIGN_RECIPIENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CAMPAIGN_RECIPIENT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <p className="text-muted-foreground text-sm" aria-live="polite">
          Loading recipients…
        </p>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load recipients</AlertTitle>
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      ) : recipients.length === 0 ? (
        <AdminEmpty
          icon={Users}
          title="No recipients to show"
          description={
            status === "all"
              ? "This campaign has no recipients."
              : "No recipients have this status."
          }
          filtered={status !== "all"}
        />
      ) : (
        <>
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">
                Campaign recipients
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    Email
                  </TableHead>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    Status
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Time
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Error
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r) => {
                  const at =
                    r.complainedAt ?? r.bouncedAt ?? r.deliveredAt ?? r.sentAt;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className={`break-all ${TABLE_CELL}`}>
                        {r.email}
                        {r.unsubscribedAt && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            Unsubscribed
                          </span>
                        )}
                        {r.error && (
                          <div className="text-destructive mt-0.5 text-xs md:hidden">
                            {r.error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={TABLE_CELL}>
                        <RecipientStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell
                        className={`text-muted-foreground hidden md:table-cell ${TABLE_CELL}`}
                      >
                        {at ? formatCampaignInstant(at, timeZone) : "—"}
                      </TableCell>
                      <TableCell
                        className={`text-muted-foreground hidden max-w-xs md:table-cell ${TABLE_CELL}`}
                      >
                        {r.error ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {query.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
