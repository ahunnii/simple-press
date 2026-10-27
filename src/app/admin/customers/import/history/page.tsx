import Link from "next/link";
import { History, Upload } from "lucide-react";

import { CONTACT_IMPORT_SOURCE_LABELS } from "~/lib/marketing/contact-import";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
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
import { AdminEmpty } from "~/app/admin/_components/admin-empty";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "~/app/admin/_components/admin-table-style";
import { TrailHeader } from "~/app/admin/_components/trail-header";

import { CampaignStatusBadge } from "../../../marketing/_components/campaign-status-badge";
import { formatCampaignDay } from "../../../marketing/_lib/format";

type ImportRow = Awaited<ReturnType<typeof api.contactImport.list>>[number];

/** `sourceKind` is a plain string column; fall back to the raw value. */
function sourceLabel(kind: string): string {
  return (
    (CONTACT_IMPORT_SOURCE_LABELS as Record<string, string | undefined>)[
      kind
    ] ?? kind
  );
}

function InviteStatus({ imp }: { imp: ImportRow }) {
  const campaign = imp.inviteCampaign;
  if (!campaign) {
    if ((imp.counts?.inviteEligible ?? 0) === 0) {
      return <span className="text-muted-foreground">No one to invite</span>;
    }
    return <Badge variant="outline">Not sent</Badge>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <CampaignStatusBadge status={campaign.status} />
      <span className="text-muted-foreground text-xs">
        {campaign.recipientCount.toLocaleString()}{" "}
        {campaign.recipientCount === 1 ? "person" : "people"}
      </span>
    </div>
  );
}

export default async function ContactImportHistoryPage() {
  // Owners and managers may READ the log (same roles as `contactImport.list`);
  // only a platform admin can run an import, so the links into the flow are
  // platform-admin-only. STAFF is redirected.
  const { membershipRole } = await requireAdminAccess({
    allowedRoles: ["OWNER", "MANAGER"],
  });
  const isPlatformAdmin = membershipRole === null;

  const [imports, business] = await Promise.all([
    api.contactImport.list().catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);
  const timeZone = business?.timeZone ?? "UTC";

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Customers", href: "/admin/customers" },
          ...(isPlatformAdmin
            ? [{ label: "Import contacts", href: "/admin/customers/import" }]
            : []),
          { label: "Import history" },
        ]}
      />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Import history</h1>
            <p>Contact lists brought over from a previous website</p>
          </div>
          {isPlatformAdmin && (
            <Button asChild size="sm">
              <Link href="/admin/customers/import">
                <Upload aria-hidden="true" className="mr-2 h-4 w-4" />
                Import contacts
              </Link>
            </Button>
          )}
        </div>

        {imports.length === 0 ? (
          <AdminEmpty
            icon={History}
            title="No imports yet"
            description="When contacts are brought over from a previous website, each import is listed here with how many came in, whether the invite email went out, and how many people have joined your list since."
            action={
              isPlatformAdmin && (
                <Button asChild>
                  <Link href="/admin/customers/import">
                    <Upload aria-hidden="true" className="mr-2 h-4 w-4" />
                    Import contacts
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">Contact imports</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    File
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Added
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Blocked
                  </TableHead>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    Invite
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Joined
                  </TableHead>
                  <TableHead scope="col" className={`${TABLE_HEAD} text-right`}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => {
                  const counts = imp.counts;
                  const campaign = imp.inviteCampaign;
                  return (
                    <TableRow key={imp.id}>
                      <TableCell className={`${TABLE_CELL} whitespace-normal`}>
                        <p className="font-medium break-all">{imp.fileName}</p>
                        <p className="text-muted-foreground text-sm">
                          {formatCampaignDay(imp.createdAt, timeZone)} ·{" "}
                          {sourceLabel(imp.sourceKind)}
                          {imp.createdByName ? ` · ${imp.createdByName}` : ""}
                        </p>
                        {counts?.fileStatus ? (
                          <p className="text-muted-foreground text-sm">
                            Whole file marked {counts.fileStatus}
                          </p>
                        ) : null}
                        <p className="text-muted-foreground mt-0.5 text-sm md:hidden">
                          {(counts?.created ?? 0).toLocaleString()} added ·{" "}
                          {imp.confirmedCount.toLocaleString()} joined
                        </p>
                      </TableCell>
                      <TableCell
                        className={`hidden md:table-cell ${TABLE_CELL} tabular-nums`}
                      >
                        {counts ? counts.created.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell
                        className={`hidden md:table-cell ${TABLE_CELL} tabular-nums`}
                      >
                        {counts ? counts.unsubscribed.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className={TABLE_CELL}>
                        <InviteStatus imp={imp} />
                      </TableCell>
                      <TableCell
                        className={`hidden md:table-cell ${TABLE_CELL} tabular-nums`}
                      >
                        {campaign ? imp.confirmedCount.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className={`${TABLE_CELL} text-right`}>
                        {campaign ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/admin/marketing/campaigns/${campaign.id}`}
                            >
                              View invite
                              <span className="sr-only">
                                {" "}
                                for {imp.fileName}
                              </span>
                            </Link>
                          </Button>
                        ) : (
                          isPlatformAdmin &&
                          (counts?.inviteEligible ?? 0) > 0 && (
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                href={`/admin/customers/import?importId=${encodeURIComponent(imp.id)}`}
                              >
                                Send invite
                                <span className="sr-only">
                                  {" "}
                                  for {imp.fileName}
                                </span>
                              </Link>
                            </Button>
                          )
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
        <p className="text-muted-foreground mt-4 text-sm">
          Imported contacts are not on your email list. They join only if they
          click join in the invite email. Anyone who was unsubscribed on the old
          site is blocked from marketing email for good.
        </p>
      </div>
    </>
  );
}

export const metadata = {
  title: "Contact import history",
};
