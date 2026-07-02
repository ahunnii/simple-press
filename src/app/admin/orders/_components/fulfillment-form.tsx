"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CARRIERS } from "~/data/fulfillment-constants";
import { CheckCircle2, Loader2, Package, Plus, Trash2 } from "lucide-react";
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

type OrderItemInfo = {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  fulfilledQuantity: number;
};

type Props = {
  orderId: string;
  orderNumber: number;
  customerEmail: string;
  customerName: string;
  items: OrderItemInfo[];
};

const remainingFor = (item: OrderItemInfo) =>
  Math.max(0, item.quantity - item.fulfilledQuantity);

export function FulfillmentForm({ orderId, customerEmail, items }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const buildItemRows = (allRemaining: boolean) =>
    items.map((item) => ({
      orderItemId: item.id,
      quantity: allRemaining ? remainingFor(item) : 0,
    }));

  const form = useForm<FulfillmentFormValues>({
    resolver: zodResolver(fulfillmentFormSchema),
    defaultValues: {
      hasTracking: true,
      shipAllRemaining: true,
      packages: [
        {
          carrier: "",
          trackingNumber: "",
          trackingUrl: "",
          items: buildItemRows(true),
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "packages",
  });

  const hasTracking = form.watch("hasTracking");
  const shipAllRemaining = form.watch("shipAllRemaining");
  const isPartiallyFulfilled = items.some((item) => item.fulfilledQuantity > 0);

  const markFulfilled = api.order.markAsFulfilled.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Fulfillment recorded and email sent to customer");
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to mark order as fulfilled");
    },
    onMutate: () => {
      toast.loading("Recording fulfillment...");
    },
  });

  const onSubmit = (data: FulfillmentFormValues) => {
    const usePartialItems = !data.shipAllRemaining && items.length > 0;

    const buildShipmentItems = (
      pkg: FulfillmentFormValues["packages"][number] | undefined,
    ) =>
      (pkg?.items ?? [])
        .filter((row) => row.quantity > 0)
        .map((row) => ({
          orderItemId: row.orderItemId,
          quantity: row.quantity,
        }));

    // Only package 0 is sent when tracking is off.
    const sentPackages = data.hasTracking
      ? data.packages
      : data.packages.slice(0, 1);

    if (usePartialItems) {
      const remainingById = new Map(
        items.map((item) => [item.id, remainingFor(item)]),
      );
      const totals = new Map<string, number>();

      for (const [i, pkg] of sentPackages.entries()) {
        const rows = buildShipmentItems(pkg);
        if (rows.length === 0) {
          toast.error(
            data.hasTracking && sentPackages.length > 1
              ? `Package ${i + 1} has no items selected`
              : "Select at least one item to fulfill",
          );
          return;
        }
        for (const row of rows) {
          totals.set(
            row.orderItemId,
            (totals.get(row.orderItemId) ?? 0) + row.quantity,
          );
        }
      }

      for (const [orderItemId, qty] of totals) {
        const remaining = remainingById.get(orderItemId) ?? 0;
        if (qty > remaining) {
          const item = items.find((it) => it.id === orderItemId);
          toast.error(
            `Cannot ship ${qty} × ${item?.productName ?? "item"} — only ${remaining} remaining to fulfill`,
          );
          return;
        }
      }
    }

    const itemsFor = (
      pkg: FulfillmentFormValues["packages"][number] | undefined,
    ) => (usePartialItems ? { items: buildShipmentItems(pkg) } : {});

    if (!data.hasTracking) {
      markFulfilled.mutate({
        orderId,
        shipments: [
          {
            carrier: undefined,
            trackingNumber: undefined,
            trackingUrl: undefined,
            ...itemsFor(data.packages[0]),
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
        ...itemsFor(pkg),
      };
    });

    markFulfilled.mutate({ orderId, shipments });
  };

  const isSubmitDisabled =
    markFulfilled.isPending || (hasTracking && !form.formState.isValid);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isPartiallyFulfilled ? "Fulfill Remaining Items" : "Mark as Fulfilled"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="border-border flex items-start gap-3 rounded-lg border p-4">
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

          {items.length > 0 && (
            <div className="border-border flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                id="shipAllRemaining"
                checked={shipAllRemaining}
                onCheckedChange={(checked) =>
                  form.setValue("shipAllRemaining", checked === true)
                }
              />
              <div className="grid gap-1">
                <Label
                  htmlFor="shipAllRemaining"
                  className="cursor-pointer font-medium"
                >
                  Ship all remaining items
                </Label>
                <p className="text-muted-foreground text-sm">
                  Uncheck to choose which items and quantities go in{" "}
                  {hasTracking ? "each package" : "this fulfillment"}.
                </p>
              </div>
            </div>
          )}

          {!hasTracking && !shipAllRemaining && items.length > 0 && (
            <div className="border-border rounded-lg border p-4">
              <PackageItemsSelector form={form} index={0} items={items} />
            </div>
          )}

          {hasTracking && (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <PackageEntry
                  key={field.id}
                  index={index}
                  form={form}
                  items={items}
                  showItemSelection={!shipAllRemaining && items.length > 0}
                  showRemove={fields.length > 1}
                  onRemove={() => remove(index)}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    carrier: "",
                    trackingNumber: "",
                    trackingUrl: "",
                    items: buildItemRows(false),
                  })
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
              <strong>Note:</strong>{" "}
              {shipAllRemaining || items.length === 0
                ? "Marking this order as fulfilled will send"
                : "Recording this fulfillment will send"}{" "}
              an email to {customerEmail}
              {hasTracking
                ? fields.length > 1
                  ? ` with tracking information for ${fields.length} packages.`
                  : " with tracking information."
                : shipAllRemaining || items.length === 0
                  ? " letting them know the order was fulfilled."
                  : " only if this fulfills the whole order."}
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
                  {shipAllRemaining || items.length === 0
                    ? "Mark as Fulfilled & Send Email"
                    : "Fulfill Selected Items & Send Email"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PackageItemsSelector({
  form,
  index,
  items,
}: {
  form: ReturnType<typeof useForm<FulfillmentFormValues>>;
  index: number;
  items: OrderItemInfo[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-foreground text-sm font-medium">
        Items in this package
      </p>
      {items.map((item, itemIndex) => {
        const remaining = remainingFor(item);

        if (remaining === 0) {
          return (
            <div
              key={item.id}
              className="text-muted-foreground flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-green-600"
                  aria-hidden="true"
                />
                <span className="truncate">
                  {item.productName}
                  {item.variantName ? ` — ${item.variantName}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs">
                All {item.quantity} shipped
              </span>
            </div>
          );
        }

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <div className="min-w-0">
              <p className="text-foreground truncate font-medium">
                {item.productName}
              </p>
              <p className="text-muted-foreground text-xs">
                {item.variantName ? `${item.variantName} · ` : ""}
                {item.fulfilledQuantity > 0
                  ? `${item.fulfilledQuantity} of ${item.quantity} already shipped`
                  : `${item.quantity} ordered`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={remaining}
                className="h-8 w-16 text-sm"
                aria-label={`Quantity of ${item.productName} in package ${index + 1}`}
                {...form.register(
                  `packages.${index}.items.${itemIndex}.quantity`,
                )}
              />
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                of {remaining}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PackageEntry({
  index,
  form,
  items,
  showItemSelection,
  showRemove,
  onRemove,
}: {
  index: number;
  form: ReturnType<typeof useForm<FulfillmentFormValues>>;
  items: OrderItemInfo[];
  showItemSelection: boolean;
  showRemove: boolean;
  onRemove: () => void;
}) {
  const carrierValue = form.watch(`packages.${index}.carrier`);
  const errors = form.formState.errors.packages?.[index];

  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      {index > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-foreground text-sm font-medium">
            Package {index + 1}
          </p>
          {showRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      <div>
        <Label htmlFor={`carrier-${index}`}>
          Carrier <span className="text-destructive">*</span>
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
          <p className="text-destructive mt-1 text-sm">
            {errors.carrier.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor={`trackingNumber-${index}`}>
          Tracking Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`trackingNumber-${index}`}
          {...form.register(`packages.${index}.trackingNumber`)}
          placeholder="1Z999AA10123456784"
          className="mt-2"
        />
        {errors?.trackingNumber && (
          <p className="text-destructive mt-1 text-sm">
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
            <p className="text-destructive mt-1 text-sm">
              {errors.trackingUrl.message}
            </p>
          )}
        </div>
      )}

      {showItemSelection && (
        <div className="border-border border-t pt-3">
          <PackageItemsSelector form={form} index={index} items={items} />
        </div>
      )}
    </div>
  );
}
