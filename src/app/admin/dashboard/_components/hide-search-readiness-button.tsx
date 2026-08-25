"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

/**
 * Inline off-switch for the dashboard "Search readiness" strip. Flips the
 * owner-toggleable `dashboardSearchReadiness` feature flag (the same switch
 * that lives under Settings → Features) and refreshes the dashboard so the
 * strip disappears. Everyone who can see the dashboard may call
 * `features.toggle`: STAFF never reaches /admin/dashboard.
 */
export function HideSearchReadinessButton() {
  const router = useRouter();
  const toggle = api.features.toggle.useMutation({
    onSuccess: () => {
      toast.success(
        "Search readiness hidden. Turn it back on under Settings → Features.",
      );
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't hide search readiness");
    },
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground shrink-0"
      aria-label="Hide search readiness from the dashboard"
      disabled={toggle.isPending}
      onClick={() =>
        toggle.mutate({ key: "dashboardSearchReadiness", enabled: false })
      }
    >
      Hide
    </Button>
  );
}
