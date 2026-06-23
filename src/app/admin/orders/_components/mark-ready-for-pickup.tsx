"use client";

import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

type Props = {
  orderId: string;
};

export function MarkReadyForPickup({ orderId }: Props) {
  const router = useRouter();

  const markReady = api.order.markReadyForPickup.useMutation({
    onMutate: () => {
      toast.loading("Notifying customer...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Customer notified — order ready for pickup");
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to mark order ready for pickup");
    },
  });

  return (
    <Button
      onClick={() => markReady.mutate({ orderId })}
      disabled={markReady.isPending}
      className="flex-1"
    >
      {markReady.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Notifying customer...
        </>
      ) : (
        <>
          <MapPin className="mr-2 h-4 w-4" />
          Mark Ready for Pickup
        </>
      )}
    </Button>
  );
}
