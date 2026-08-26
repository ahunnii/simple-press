"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";
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
import { Button } from "~/components/ui/button";

/** Mirrors `PAUSABLE_STATUSES` in `~/lib/subscriptions/actions` — a healthy
 *  or dunning subscription can be paused; only "paused" can be resumed. */
const PAUSABLE_STATUSES = new Set(["active", "past_due"]);

const FEATURE_DISABLED_HELP =
  "Turn Subscriptions back on in Settings → Features to pause or resume.";

type Props = {
  subscriptionId: string;
  status: string;
  featureEnabled: boolean;
};

export function SubscriptionActions({
  subscriptionId,
  status,
  featureEnabled,
}: Props) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const afterWrite = () => router.refresh();

  const cancelMutation = api.subscription.cancel.useMutation({
    onSuccess: () => {
      toast.success("Subscription cancelled");
      setShowCancelDialog(false);
      afterWrite();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel subscription");
    },
  });

  const pauseMutation = api.subscription.pause.useMutation({
    onSuccess: () => {
      toast.success("Subscription paused");
      afterWrite();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to pause subscription");
    },
  });

  const resumeMutation = api.subscription.resume.useMutation({
    onSuccess: () => {
      toast.success("Subscription resumed");
      afterWrite();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to resume subscription");
    },
  });

  const isCancelled = status === "cancelled";
  const isPaused = status === "paused";
  const canPause = featureEnabled && PAUSABLE_STATUSES.has(status);
  const canResume = featureEnabled && isPaused;

  // Neither button is ever both visible AND state-disabled at once — the
  // toggle below always renders Resume for "paused" (state-enabled whenever
  // the flag is on) and Pause for everything else, so the only state that can
  // disable the VISIBLE button is "cancelled"/"incomplete".
  const stateDisabledReason =
    isPaused || PAUSABLE_STATUSES.has(status)
      ? undefined
      : `A ${status} subscription can't be paused or resumed`;

  const pauseResumeTitle = !featureEnabled
    ? FEATURE_DISABLED_HELP
    : stateDisabledReason;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isPaused ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => resumeMutation.mutate({ id: subscriptionId })}
            disabled={!canResume || resumeMutation.isPending}
            title={pauseResumeTitle}
          >
            <Play className="mr-2 h-4 w-4" />
            {resumeMutation.isPending ? "Resuming…" : "Resume"}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pauseMutation.mutate({ id: subscriptionId })}
            disabled={!canPause || pauseMutation.isPending}
            title={pauseResumeTitle}
          >
            <Pause className="mr-2 h-4 w-4" />
            {pauseMutation.isPending ? "Pausing…" : "Pause"}
          </Button>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowCancelDialog(true)}
          disabled={isCancelled}
          title={
            isCancelled ? "This subscription is already cancelled" : undefined
          }
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              This takes effect immediately — no refund is issued, and any
              delivery already paid for still ships. The customer will be
              emailed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>
              Go back
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => cancelMutation.mutate({ id: subscriptionId })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel subscription"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
