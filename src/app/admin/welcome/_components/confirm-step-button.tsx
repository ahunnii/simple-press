"use client";

import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { SetupStepKey } from "~/lib/admin/setup-plan";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

type Props = {
  step: SetupStepKey;
  /** The owner has already marked this step done — offer "Undo". */
  confirmed: boolean;
};

/**
 * "Mark as done" for setup steps the platform can't verify (sales tax,
 * shipping or pickup). The checklist stays a server component; this is the
 * only client piece in it.
 */
export function ConfirmStepButton({ step, confirmed }: Props) {
  const router = useRouter();

  const confirmMutation = api.business.confirmSetupStep.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => toast.error(err.message ?? "Couldn't update this step"),
  });

  if (confirmed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">Marked as done</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={confirmMutation.isPending}
          onClick={() => confirmMutation.mutate({ step, confirmed: false })}
        >
          {confirmMutation.isPending && (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          )}
          Undo
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={confirmMutation.isPending}
      onClick={() => confirmMutation.mutate({ step, confirmed: true })}
    >
      {confirmMutation.isPending ? (
        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
      ) : (
        <Check className="mr-2 h-3 w-3" />
      )}
      Mark as done
    </Button>
  );
}
