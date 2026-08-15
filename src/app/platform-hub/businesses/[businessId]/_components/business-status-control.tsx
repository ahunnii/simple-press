"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

type BusinessStatus = "active" | "suspended" | "closed";

// Fixed order the target-status buttons render in, regardless of current
// status — keeps "Reactivate" / "Suspend" / "Close" always left-to-right.
const STATUS_ORDER: BusinessStatus[] = ["active", "suspended", "closed"];

// Copy for the confirmation dialog, keyed by the TARGET status (not the
// current one). `destructive` drives both the trigger button's and the
// AlertDialogAction's variant. Consequence copy is fact-checked against the
// enforcement in `~/server/api/trpc.ts` (ownerAdminProcedure/staffProcedure/
// ownerOnlyProcedure/getBusinessProcedure all 404 a non-active business for
// everyone except a platform admin) and the trustedOrigins query in
// `~/server/better-auth/config.tsx` (only "closed" is dropped as a trusted
// sign-in origin — "suspended" stays trusted so the owner can still sign in
// to see the suspension).
const STATUS_ACTION_COPY: Record<
  BusinessStatus,
  { actionLabel: string; description: string; destructive: boolean }
> = {
  active: {
    actionLabel: "Reactivate",
    description:
      "Restores full storefront, checkout, and admin access for this business immediately.",
    destructive: false,
  },
  suspended: {
    actionLabel: "Suspend",
    description:
      "Suspending blocks all storefront, checkout, and admin activity for this business — the storefront and admin dashboard will 404 for everyone except platform admins. Sign-in stays reachable so the owner can be contacted, and you can reactivate at any time.",
    destructive: true,
  },
  closed: {
    actionLabel: "Close",
    description:
      "Closing blocks all storefront, checkout, and admin activity for this business, and also revokes it as a trusted sign-in origin — the owner will no longer be able to sign in on this store's domain. Use this only for businesses that have permanently shut down.",
    destructive: true,
  },
};

function isBusinessStatus(value: string): value is BusinessStatus {
  return (STATUS_ORDER as string[]).includes(value);
}

type Props = {
  businessId: string;
  businessName: string;
  status: string;
};

export function BusinessStatusControl({
  businessId,
  businessName,
  status,
}: Props) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<BusinessStatus | null>(
    null,
  );

  // `status` comes off `Business.status`, a plain `String` column
  // (`active | suspended | closed` by convention, not a Prisma enum) — fall
  // back to "active" for any unrecognized value rather than rendering all
  // three action buttons at once.
  const currentStatus: BusinessStatus = isBusinessStatus(status)
    ? status
    : "active";

  const setStatusMutation = api.platform.setBusinessStatus.useMutation({
    onSuccess: (updated) => {
      toast.success(`${businessName} is now ${updated.status}.`);
      setPendingStatus(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update business status");
    },
  });

  const availableTargets = STATUS_ORDER.filter((s) => s !== currentStatus);
  const pendingCopy = pendingStatus ? STATUS_ACTION_COPY[pendingStatus] : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={currentStatus === "active" ? "default" : "secondary"}>
        {currentStatus}
      </Badge>

      {availableTargets.map((target) => {
        const copy = STATUS_ACTION_COPY[target];
        return (
          <Button
            key={target}
            type="button"
            variant={copy.destructive ? "destructive" : "outline"}
            size="sm"
            onClick={() => setPendingStatus(target)}
            disabled={setStatusMutation.isPending}
          >
            {copy.actionLabel}
          </Button>
        );
      })}

      {/* Single shared confirm dialog, controlled by `pendingStatus` rather
          than an AlertDialogTrigger per button — same pattern as the Remove
          member / Revoke invite dialogs in team-members.tsx. */}
      <AlertDialog
        open={!!pendingStatus}
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCopy
                ? `${pendingCopy.actionLabel} ${businessName}?`
                : "Change business status?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCopy?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={setStatusMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, not className — a className here renders the
                button black regardless of intended color, per the existing
                AlertDialogAction usages in this codebase. */}
            <AlertDialogAction
              variant={pendingCopy?.destructive ? "destructive" : "default"}
              onClick={() => {
                if (pendingStatus) {
                  setStatusMutation.mutate({
                    businessId,
                    status: pendingStatus,
                  });
                }
              }}
              disabled={setStatusMutation.isPending}
            >
              {setStatusMutation.isPending
                ? "Saving…"
                : (pendingCopy?.actionLabel ?? "Confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
