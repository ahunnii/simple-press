"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CARRIERS } from "~/data/fulfillment-constants";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
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
  const utils = api.useUtils();

  const form = useForm<FulfillmentFormValues>({
    resolver: zodResolver(fulfillmentFormSchema),
    defaultValues: {
      hasTracking: true,
      packages: [{ carrier: "", trackingNumber: "", trackingUrl: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
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
      markFulfilled.mutate({
        orderId,
        shipments: [
          {
            carrier: undefined,
            trackingNumber: undefined,
            trackingUrl: undefined,
          },
        ],
      });
      return;
    }

    const shipments = data.packages.map((pkg) => {
      let trackingUrl = pkg.trackingUrl;
      if (!trackingUrl) {
        const carrier = CARRIERS.find((c) => c.value === pkg.carrier);
        if (carrier?.trackingUrl) {
          trackingUrl = `${carrier.trackingUrl}${pkg.trackingNumber}`;
        }
      }
      return {
        carrier: pkg.carrier,
        trackingNumber: pkg.trackingNumber,
        trackingUrl: trackingUrl ?? "",
      };
    });

    markFulfilled.mutate({ orderId, shipments });
  };

  const isSubmitDisabled =
    markFulfilled.isPending || (hasTracking && !form.formState.isValid);

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
                form.setValue("hasTracking", checked === true, {
                  shouldValidate: true,
                })
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
            <div className="space-y-4">
              {fields.map((field, index) => (
                <PackageEntry
                  key={field.id}
                  index={index}
                  form={form}
                  showRemove={fields.length > 1}
                  onRemove={() => remove(index)}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ carrier: "", trackingNumber: "", trackingUrl: "" })
                }
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Additional Tracking Information
              </Button>
            </div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Marking this order as fulfilled will send
              an email to {customerEmail}
              {hasTracking
                ? fields.length > 1
                  ? ` with tracking information for ${fields.length} packages.`
                  : " with tracking information."
                : " letting them know the order was fulfilled."}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1"
            >
              {markFulfilled.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Mark as Fulfilled &amp; Send Email
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PackageEntry({
  index,
  form,
  showRemove,
  onRemove,
}: {
  index: number;
  form: ReturnType<typeof useForm<FulfillmentFormValues>>;
  showRemove: boolean;
  onRemove: () => void;
}) {
  const carrierValue = form.watch(`packages.${index}.carrier`);
  const errors = form.formState.errors.packages?.[index];

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 p-4">
      {index > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            Package {index + 1}
          </p>
          {showRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div>
        <Label htmlFor={`carrier-${index}`}>
          Carrier <span className="text-red-500">*</span>
        </Label>
        <Select
          value={carrierValue ?? ""}
          onValueChange={(value) =>
            form.setValue(`packages.${index}.carrier`, value, {
              shouldValidate: true,
            })
          }
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
        {errors?.carrier && (
          <p className="mt-1 text-sm text-red-600">{errors.carrier.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor={`trackingNumber-${index}`}>
          Tracking Number <span className="text-red-500">*</span>
        </Label>
        <Input
          id={`trackingNumber-${index}`}
          {...form.register(`packages.${index}.trackingNumber`)}
          placeholder="1Z999AA10123456784"
          className="mt-2"
        />
        {errors?.trackingNumber && (
          <p className="mt-1 text-sm text-red-600">
            {errors.trackingNumber.message}
          </p>
        )}
      </div>

      {carrierValue === "other" && (
        <div>
          <Label htmlFor={`trackingUrl-${index}`}>Tracking URL</Label>
          <Input
            id={`trackingUrl-${index}`}
            {...form.register(`packages.${index}.trackingUrl`)}
            placeholder="https://..."
            className="mt-2"
          />
          {errors?.trackingUrl && (
            <p className="mt-1 text-sm text-red-600">
              {errors.trackingUrl.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
