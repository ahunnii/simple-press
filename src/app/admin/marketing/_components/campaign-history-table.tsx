"use client";

import Link from "next/link";
import { Loader2, Mail, Plus } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import { formatCampaignDay, pluralize } from "../_lib/format";
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

type Props = {
  /** First page, fetched on the server so the table renders with the page. */
  initialPage: CampaignsPage;
  timeZone: string;
};

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

export function CampaignHistoryTable({ initialPage, timeZone }: Props) {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const isDraft = campaign.status === "DRAFT";
              const date = campaign.queuedAt ?? campaign.createdAt;
              return (
                <TableRow key={campaign.id}>
                  <TableCell className={TABLE_CELL}>
                    <Link
                      href={`${CAMPAIGNS_PATH}/${campaign.id}`}
                      className="font-medium hover:underline"
                    >
                      {campaign.subject}
                    </Link>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                      <CampaignStatusBadge status={campaign.status} />
                      <span>{formatCampaignDay(date, timeZone)}</span>
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
                    {formatCampaignDay(date, timeZone)}
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
