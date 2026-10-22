"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarX2,
  Copy,
  Loader2,
  Mail,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  formatCampaignDay,
  formatCampaignInstant,
  pluralize,
} from "../_lib/format";
import { AdminEmpty } from "../../_components/admin-empty";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import { CampaignStatusBadge } from "./campaign-status-badge";

type CampaignsPage = RouterOutputs["marketing"]["listCampaigns"];
type CampaignRow = CampaignsPage["campaigns"][number];

const CAMPAIGNS_PATH = "/admin/marketing/campaigns";

/**
 * The trailing actions column stays pinned to the right edge of the scroll
 * area, so Duplicate / Unschedule are reachable at laptop widths where the
 * table is wider than its card. The cells need an OPAQUE background (the
 * columns scroll underneath), so they use the card colour and mirror the
 * row's hover tint by hand; a hairline + faint shadow marks the seam.
 */
const STICKY_ACTIONS =
  "bg-card sticky right-0 z-10 border-l shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.12)] dark:shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.5)]";
const STICKY_ACTIONS_CELL = `${STICKY_ACTIONS} group-hover/row:bg-[color-mix(in_oklab,var(--card),var(--muted)_50%)]`;

type Props = {
  /** First page, fetched on the server so the table renders with the page. */
  initialPage: CampaignsPage;
  timeZone: string;
  /** False when the emailMarketing flag is off: Duplicate is hidden. */
  emailMarketingEnabled?: boolean;
};

/** The Date column: a scheduled campaign shows when it will go out. */
function dateLabel(campaign: CampaignRow, timeZone: string): string {
  if (campaign.status === "SCHEDULED" && campaign.scheduledAt) {
    return `Sends ${formatCampaignInstant(campaign.scheduledAt, timeZone)}`;
  }
  return formatCampaignDay(campaign.queuedAt ?? campaign.createdAt, timeZone);
}

/** A campaign's delivered count: a complaint can only follow a delivery. */
function deliveredCount(counts: CampaignRow["counts"]) {
  return counts.byStatus.DELIVERED + counts.byStatus.COMPLAINED;
}

function CountCell({ value, show }: { value: number; show: boolean }) {
  return (
    <TableCell
      className={`hidden text-right tabular-nums md:table-cell ${TABLE_CELL}`}
    >
      {show ? (
        value.toLocaleString()
      ) : (
        <span className="text-muted-foreground" aria-label="Not sent yet">
          —
        </span>
      )}
    </TableCell>
  );
}

const NUMERIC_HEAD = `hidden text-right md:table-cell ${TABLE_HEAD}`;

export function CampaignHistoryTable({
  initialPage,
  timeZone,
  emailMarketingEnabled = true,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const duplicate = api.marketing.duplicateCampaign.useMutation({
    onSuccess: ({ id }) => {
      toast.success("Copied to a new draft");
      void utils.marketing.listCampaigns.invalidate();
      router.push(`${CAMPAIGNS_PATH}/${id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't duplicate the campaign");
    },
  });
  const unschedule = api.marketing.unscheduleCampaign.useMutation({
    onSuccess: () => {
      toast.success("Unscheduled. It's back in your drafts.");
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't unschedule the campaign");
    },
    onSettled: () => {
      void utils.marketing.listCampaigns.invalidate();
    },
  });

  const query = api.marketing.listCampaigns.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialData: { pages: [initialPage], pageParams: [undefined] },
      // Counts move after a send (webhooks), and a campaign may have just been
      // created or sent from the composer: always re-read on mount.
      staleTime: 0,
    },
  );

  const campaigns = query.data.pages.flatMap((p) => p.campaigns);

  if (campaigns.length === 0) {
    return (
      <AdminEmpty
        icon={Mail}
        title="No campaigns yet"
        description="Campaigns go only to customers who opted in to marketing emails. Write one to announce news, a sale, or a newsletter."
        action={
          <Button asChild>
            <Link href={`${CAMPAIGNS_PATH}/new`}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New campaign
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className={TABLE_CARD}>
        <Table>
          <TableCaption className="sr-only">Campaign history</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className={TABLE_HEAD}>
                Subject
              </TableHead>
              <TableHead
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEAD}`}
              >
                Status
              </TableHead>
              <TableHead
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEAD}`}
              >
                Date
              </TableHead>
              <TableHead scope="col" className={NUMERIC_HEAD}>
                Recipients
              </TableHead>
              <TableHead scope="col" className={NUMERIC_HEAD}>
                Delivered
              </TableHead>
              <TableHead scope="col" className={NUMERIC_HEAD}>
                Bounced
              </TableHead>
              <TableHead scope="col" className={NUMERIC_HEAD}>
                Spam reports
              </TableHead>
              <TableHead scope="col" className={NUMERIC_HEAD}>
                Unsubscribed
              </TableHead>
              <TableHead
                scope="col"
                className={`${TABLE_HEAD} ${STICKY_ACTIONS}`}
              >
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              // Drafts and scheduled campaigns have no results yet.
              const isDraft =
                campaign.status === "DRAFT" || campaign.status === "SCHEDULED";
              const isScheduled = campaign.status === "SCHEDULED";
              const date = dateLabel(campaign, timeZone);
              return (
                <TableRow key={campaign.id} className="group/row">
                  <TableCell className={TABLE_CELL}>
                    <Link
                      href={`${CAMPAIGNS_PATH}/${campaign.id}`}
                      className="font-medium hover:underline"
                    >
                      {campaign.subject}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                      <CampaignStatusBadge status={campaign.status} />
                      <span>{date}</span>
                      {!isDraft && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {campaign.recipientCount.toLocaleString()}{" "}
                            {pluralize(campaign.recipientCount, "recipient")}
                          </span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={`hidden md:table-cell ${TABLE_CELL}`}>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell
                    className={`text-muted-foreground hidden md:table-cell ${TABLE_CELL}`}
                  >
                    {date}
                  </TableCell>
                  <CountCell value={campaign.recipientCount} show={!isDraft} />
                  <CountCell
                    value={deliveredCount(campaign.counts)}
                    show={!isDraft}
                  />
                  <CountCell
                    value={campaign.counts.byStatus.BOUNCED}
                    show={!isDraft}
                  />
                  <CountCell
                    value={campaign.counts.byStatus.COMPLAINED}
                    show={!isDraft}
                  />
                  <CountCell
                    value={campaign.counts.unsubscribed}
                    show={!isDraft}
                  />
                  <TableCell
                    className={`${TABLE_CELL} ${STICKY_ACTIONS_CELL} text-right`}
                  >
                    {(emailMarketingEnabled || isScheduled) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${campaign.subject}`}
                          >
                            <MoreHorizontal
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {emailMarketingEnabled && (
                            <DropdownMenuItem
                              disabled={duplicate.isPending}
                              onClick={() =>
                                duplicate.mutate({ id: campaign.id })
                              }
                            >
                              <Copy
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Duplicate
                            </DropdownMenuItem>
                          )}
                          {isScheduled && (
                            <DropdownMenuItem
                              disabled={unschedule.isPending}
                              onClick={() =>
                                unschedule.mutate({ id: campaign.id })
                              }
                            >
                              <CalendarX2
                                className="mr-2 h-4 w-4"
                                aria-hidden="true"
                              />
                              Unschedule
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
    </div>
  );
}
