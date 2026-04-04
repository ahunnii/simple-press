"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CARRIERS } from "~/data/fulfillment-constants";
import { Loader2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { FulfillmentFormValues } from "~/lib/validators/order";
import { fulfillmentFormSchema } from "~/lib/validators/order";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Props = {
  orderId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string;
};

export function FulfillmentForm({ orderId, customerEmail }: Props) {
  const router = useRouter();
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");
  const utils = api.useUtils();

  const form = useForm<FulfillmentFormValues>({
    resolver: zodResolver(fulfillmentFormSchema),
    defaultValues: {
      hasTracking: true,
      carrier: "",
      trackingNumber: "",
      trackingUrl: "",
    },
  });

  const hasTracking = form.watch("hasTracking");

  const markFulfilled = api.order.markAsFulfilled.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Order marked as fulfilled and email sent to customer");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to mark order as fulfilled");
    },
    onMutate: () => {
      toast.loading("Marking order as fulfilled...");
    },
  });

  const onSubmit = (data: FulfillmentFormValues) => {
    if (!data.hasTracking) {
      markFulfilled.mutate({ orderId });
      return;
    }

    let trackingUrl = data.trackingUrl;
    if (!trackingUrl) {
      const carrier = CARRIERS.find((c) => c.value === data.carrier);
      if (carrier?.trackingUrl) {
        trackingUrl = `${carrier.trackingUrl}${data.trackingNumber}`;
      }
    }

    markFulfilled.mutate({
      orderId,
      carrier: data.carrier,
      trackingNumber: data.trackingNumber,
      trackingUrl: trackingUrl ?? "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mark as Fulfilled</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
            <Checkbox
              id="hasTracking"
              checked={hasTracking}
              onCheckedChange={(checked) =>
                form.setValue("hasTracking", checked === true)
              }
            />
            <div className="grid gap-1">
              <Label
                htmlFor="hasTracking"
                className="cursor-pointer font-medium"
              >
                Include tracking information
              </Label>
              <p className="text-muted-foreground text-sm">
                Uncheck if you&apos;re marking the order fulfilled without a
                tracking number. The customer will get a different email.
              </p>
            </div>
          </div>

          {hasTracking && (
            <>
              <div>
                <Label htmlFor="carrier">
                  Carrier <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.watch("carrier")}
                  onValueChange={(value) => {
                    form.setValue("carrier", value);
                    setSelectedCarrier(value);
                  }}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((carrier) => (
                      <SelectItem key={carrier.value} value={carrier.value}>
                        {carrier.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.carrier && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.carrier.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="trackingNumber">
                  Tracking Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trackingNumber"
                  {...form.register("trackingNumber")}
                  placeholder="1Z999AA10123456784"
                  className="mt-2"
                />
                {form.formState.errors.trackingNumber && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.trackingNumber.message}
                  </p>
                )}
              </div>

              {selectedCarrier === "other" && (
                <div>
                  <Label htmlFor="trackingUrl">Tracking URL</Label>
                  <Input
                    id="trackingUrl"
                    {...form.register("trackingUrl")}
                    placeholder="https://..."
                    className="mt-2"
                  />
                  {form.formState.errors.trackingUrl && (
                    <p className="mt-1 text-sm text-red-600">
                      {form.formState.errors.trackingUrl.message}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Marking this order as fulfilled will send
              an email to {customerEmail}
              {hasTracking
                ? " with tracking information."
                : " letting them know the order was fulfilled."}
            </p>
          </div>

          <Button
            type="submit"
            disabled={markFulfilled.isPending}
            className="w-full"
          >
            {markFulfilled.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Mark as Fulfilled & Send Email
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
