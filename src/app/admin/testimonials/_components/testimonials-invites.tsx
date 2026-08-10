"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2, Mail, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { InviteStatus } from "~/lib/validators/testimonials";
import type { RouterOutputs } from "~/trpc/react";
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

import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { SendInviteDialog } from "./send-invite-dialog";

// The row shape `testimonial.listInvites` returns, plus the one derivation
// the page computes once (via `getInviteStatus` in
// `~/lib/validators/testimonials`) and hands down as `status`. The client
// never calls `new Date()` itself — same SSR/hydration hazard documented on
// `DiscountRow` in `discounts-client.tsx`.
export type InviteRow = RouterOutputs["testimonial"]["listInvites"][number] & {
  status: InviteStatus;
};

type Props = {
  /** The current page slice only — filtering/sorting/paging happen in page.tsx. */
  invites: InviteRow[];
  filters: AdminFilterDef[];
  /** Unfiltered total — distinguishes "no invites sent yet" from "no matches". */
  totalInvites: number;
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

// NOT `/admin/testimonials?tab=invites` — `AdminFilters`/`AdminPagination`
// build hrefs as `${basePath}?${params}`, and `tab=invites` survives their
// navigation anyway because both copy every current search param (see the
// comment on `inviteSearch` in page.tsx). The explicit `?tab=invites` href
// below is only for the "clear filters" link, where there ARE no other
// params left to carry the tab forward.
const BASE_PATH = "/admin/testimonials";
const ITEM_NOUN = { one: "invite", many: "invites" } as const;

const TH = TABLE_HEAD;
const TD = TABLE_CELL;

const STATUS_BADGE_VARIANT: Record<
  InviteStatus,
  "success" | "secondary" | "destructive"
> = {
  completed: "success",
  pending: "secondary",
  expired: "destructive",
};

const STATUS_LABEL: Record<InviteStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  expired: "Expired",
};

/**
 * Display name for an invite row. `customer.firstName`/`lastName` are both
 * nullable, so joining unconditionally risks rendering "null" — filter drops
 * whichever half is missing and falls back to the invite email when neither
 * is present.
 */
function resolveDisplayName(invite: InviteRow): {
  name: string;
  hasName: boolean;
} {
  const parts = [invite.customer?.firstName, invite.customer?.lastName].filter(
    (part): part is string => !!part,
  );
  const fullName = parts.join(" ");
  return fullName.length > 0
    ? { name: fullName, hasName: true }
    : { name: invite.email, hasName: false };
}

function formatDate(date: Date): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function TestimonialsInvites({
  invites,
  filters,
  totalInvites,
  totalCount,
  totalPages,
  page,
  pageSize,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);

  const afterWrite = () => {
    void utils.testimonial.invalidate();
    router.refresh();
  };

  const resendInviteMutation = api.testimonial.resendInvite.useMutation({
    onMutate: loadingToast("Resending invite…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invite resent");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to resend invite");
    },
  });

  const cancelInviteMutation = api.testimonial.cancelInvite.useMutation({
    onMutate: loadingToast("Cancelling invite…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invite cancelled");
      setCancelInviteId(null);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to cancel invite");
    },
  });

  // No invites sent at all, regardless of the current filters — offer the
  // send-invite action directly rather than a "no matches" dead end.
  if (totalInvites === 0) {
    return (
      <AdminEmpty
        icon={Mail}
        title="No invites sent yet"
        description="Invite a customer to submit a testimonial — they'll get an email with a unique link."
        action={<SendInviteDialog />}
      />
    );
  }

  return (
    <>
      {/* No selection / no bulk bar here, unlike the testimonials tab —
          Resend and Cancel stay per-row actions. Only two actions exist and
          neither benefits from a multi-select bulk bar (Inventory precedent:
          selective adoption of the shared primitives, not every table needs
          every piece). */}
      <AdminFilters
        basePath={BASE_PATH}
        searchPlaceholder="Search invites…"
        searchAriaLabel="Search invites by recipient name or email"
        filters={filters}
        resultCount={totalCount}
        itemNoun={ITEM_NOUN}
      />

      {totalCount === 0 ? (
        <AdminEmpty
          icon={Search}
          title="No invites match your filters"
          filtered
          action={
            <Button variant="outline" asChild>
              <Link href="/admin/testimonials?tab=invites">Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">
                Testimonial invites
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TH}>
                    Recipient
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Status
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Sent
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TH}`}
                  >
                    Expires
                  </TableHead>
                  <TableHead scope="col" className={`${TH} text-right`}>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const isResending =
                    resendInviteMutation.isPending &&
                    resendInviteMutation.variables?.id === invite.id;
                  const isCancelling =
                    cancelInviteMutation.isPending &&
                    cancelInviteMutation.variables?.id === invite.id;
                  const { name, hasName } = resolveDisplayName(invite);
                  const canResend =
                    invite.status === "pending" || invite.status === "expired";
                  const canCancel = invite.status === "pending";
                  const sentLabel = formatDate(invite.createdAt);
                  const expiresLabel = formatDate(invite.expiresAt);
                  // Rendered in both the desktop Status cell and the
                  // `md:hidden` reflow line — completed rows show "Used",
                  // pending/expired rows show "Expires".
                  const expiryOrUsedLine =
                    invite.status === "completed" && invite.usedAt
                      ? `Used ${formatDate(invite.usedAt)}`
                      : `Expires ${expiresLabel}`;

                  return (
                    <TableRow key={invite.id}>
                      <TableCell className={`${TD} whitespace-normal`}>
                        <div className="font-medium">{name}</div>
                        {hasName && (
                          <div className="text-muted-foreground text-sm">
                            {invite.email}
                          </div>
                        )}
                        <div className="text-muted-foreground text-xs">
                          Up to {invite.maxPhotos}{" "}
                          {invite.maxPhotos === 1 ? "photo" : "photos"}
                        </div>

                        {/* Below md the Status/Sent/Expires columns are
                            hidden — reflow them here. */}
                        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                          <span>{STATUS_LABEL[invite.status]}</span>
                          <span aria-hidden="true">·</span>
                          <span>Sent {sentLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{expiryOrUsedLine}</span>
                        </div>
                      </TableCell>

                      <TableCell className={`hidden md:table-cell ${TD}`}>
                        <Badge
                          variant={STATUS_BADGE_VARIANT[invite.status]}
                          className="text-xs"
                        >
                          {STATUS_LABEL[invite.status]}
                        </Badge>
                        {invite.status === "completed" && invite.usedAt && (
                          <div className="text-muted-foreground mt-1 text-xs">
                            Used {formatDate(invite.usedAt)}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className={`hidden md:table-cell ${TD}`}>
                        {sentLabel}
                      </TableCell>

                      <TableCell className={`hidden md:table-cell ${TD}`}>
                        {expiresLabel}
                      </TableCell>

                      <TableCell className={`${TD} text-right`}>
                        {(canResend || canCancel) && (
                          <div className="flex justify-end gap-2">
                            {canResend && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isResending || isCancelling}
                                onClick={() =>
                                  resendInviteMutation.mutate({ id: invite.id })
                                }
                                aria-label="Resend invite"
                              >
                                {isResending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                                <span className="ml-1.5 hidden sm:inline">
                                  Resend
                                </span>
                              </Button>
                            )}
                            {canCancel && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isResending || isCancelling}
                                onClick={() => setCancelInviteId(invite.id)}
                                className="text-destructive hover:text-destructive"
                                aria-label="Cancel invite"
                              >
                                {isCancelling ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                                <span className="ml-1.5 hidden sm:inline">
                                  Cancel
                                </span>
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            basePath={BASE_PATH}
            itemNoun={ITEM_NOUN}
          />
        </>
      )}

      {/* Cancel invite confirmation */}
      <AlertDialog
        open={!!cancelInviteId}
        onOpenChange={(open) => {
          if (!open) setCancelInviteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This will expire the invite immediately. The recipient will no
              longer be able to use their link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelInviteMutation.isPending}>
              Keep invite
            </AlertDialogCancel>
            {/* `variant`, NOT className — a className here would land on the
                inner Slot element while Button still supplies `bg-primary`,
                and without tailwind-merge CSS order decides: `bg-destructive`
                would render BLACK. See DiscountsClient's delete dialog. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (cancelInviteId)
                  cancelInviteMutation.mutate({ id: cancelInviteId });
              }}
              disabled={cancelInviteMutation.isPending}
            >
              {cancelInviteMutation.isPending ? "Cancelling…" : "Cancel invite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
