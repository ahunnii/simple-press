"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const fulfillmentSchema = z.object({
  carrier: z.string().min(1, "Carrier is required"),
  trackingNumber: z.string().min(1, "Tracking number is required"),
  trackingUrl: z
    .string()
    .url("Invalid tracking URL")
    .optional()
    .or(z.literal("")),
});

type FulfillmentFormValues = z.infer<typeof fulfillmentSchema>;

const CARRIERS = [
  {
    value: "usps",
    label: "USPS",
    trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  },
  {
    value: "ups",
    label: "UPS",
    trackingUrl: "https://www.ups.com/track?tracknum=",
  },
  {
    value: "fedex",
    label: "FedEx",
    trackingUrl: "https://www.fedex.com/fedextrack/?tracknumbers=",
  },
  {
    value: "dhl",
    label: "DHL",
    trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB=",
  },
  { value: "other", label: "Other", trackingUrl: "" },
];

type FulfillmentFormProps = {
  orderId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string;
};

export function FulfillmentForm({
  orderId,
  customerEmail,
}: FulfillmentFormProps) {
  const router = useRouter();
  const [selectedCarrier, setSelectedCarrier] = useState<string>("");

  const form = useForm<FulfillmentFormValues>({
    resolver: zodResolver(fulfillmentSchema),
    defaultValues: {
      carrier: "",
      trackingNumber: "",
      trackingUrl: "",
    },
  });

  const markFulfilled = api.order.markAsFulfilled.useMutation({
    onSuccess: () => {
      toast.success("Order marked as fulfilled and email sent to customer");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to mark order as fulfilled");
    },
  });

  const onSubmit = (data: FulfillmentFormValues) => {
    // Auto-generate tracking URL if carrier is known
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
          <div>
            <Label htmlFor="carrier">Carrier *</Label>
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
            <Label htmlFor="trackingNumber">Tracking Number *</Label>
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

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Marking this order as fulfilled will send a
              shipping confirmation email to {customerEmail} with tracking
              information.
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
