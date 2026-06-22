"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CARRIERS } from "~/data/fulfillment-constants";
import { formatDistanceToNow } from "date-fns";
import { Edit2, Loader2, Package, Plus, Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Shipment = {
  id: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: Date;
};

type Props = {
  orderId: string;
  shipments: Shipment[];
};

const shipmentFormSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().optional(),
});

type ShipmentFormValues = z.infer<typeof shipmentFormSchema>;

export function ShipmentsPanel({ orderId, shipments }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const addShipment = api.order.addShipment.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Shipment added and email sent to customer");
      setShowAddForm(false);
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to add shipment");
    },
    onMutate: () => toast.loading("Adding shipment..."),
  });

  const updateShipment = api.order.updateShipment.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Shipment updated");
      setEditingId(null);
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update shipment");
    },
    onMutate: () => toast.loading("Updating shipment..."),
  });

  const carrierLabel = (value: string | null) =>
    CARRIERS.find((c) => c.value === value)?.label ?? value ?? "Unknown";

  return (
    <div className="mt-4 space-y-3">
      {shipments.map((shipment, index) =>
        editingId === shipment.id ? (
          <ShipmentForm
            key={shipment.id}
            defaultValues={{
              carrier: shipment.carrier ?? "",
              trackingNumber: shipment.trackingNumber ?? "",
              trackingUrl: shipment.trackingUrl ?? "",
            }}
            onSubmit={(values) => {
              updateShipment.mutate({
                shipmentId: shipment.id,
                carrier: values.carrier,
                trackingNumber: values.trackingNumber,
                trackingUrl: values.trackingUrl,
              });
            }}
            onCancel={() => setEditingId(null)}
            isPending={updateShipment.isPending}
            submitLabel="Save Changes"
          />
        ) : (
          <div
            key={shipment.id}
            className="flex items-start justify-between rounded-lg border border-border p-3"
          >
            <div className="flex items-start gap-2">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">
                  Package {index + 1} &mdash;{" "}
                  {formatDistanceToNow(new Date(shipment.shippedAt), {
                    addSuffix: true,
                  })}
                </p>
                {shipment.carrier && (
                  <p className="text-sm font-medium">
                    {carrierLabel(shipment.carrier)}
                  </p>
                )}
                {shipment.trackingNumber && (
                  <p className="font-mono text-sm">{shipment.trackingNumber}</p>
                )}
                {shipment.trackingUrl && (
                  <a
                    href={shipment.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Track Package →
                  </a>
                )}
                {!shipment.trackingNumber && (
                  <p className="text-sm text-muted-foreground italic">No tracking</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setEditingId(shipment.id)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      )}

      {showAddForm ? (
        <ShipmentForm
          defaultValues={{ carrier: "", trackingNumber: "", trackingUrl: "" }}
          onSubmit={(values) => {
            addShipment.mutate({
              orderId,
              carrier: values.carrier,
              trackingNumber: values.trackingNumber,
              trackingUrl: values.trackingUrl,
            });
          }}
          onCancel={() => setShowAddForm(false)}
          isPending={addShipment.isPending}
          submitLabel="Add & Send Email"
        />
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Additional Tracking
        </Button>
      )}

      {shipments.length === 0 && !showAddForm && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>No tracking information recorded.</span>
        </div>
      )}
    </div>
  );
}

function ShipmentForm({
  defaultValues,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  defaultValues: ShipmentFormValues;
  onSubmit: (values: ShipmentFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const form = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentFormSchema),
    defaultValues,
  });

  const carrierValue = form.watch("carrier");

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted p-3">
      <div>
        <Label className="text-xs">Carrier</Label>
        <Select
          value={carrierValue ?? ""}
          onValueChange={(v) => form.setValue("carrier", v)}
        >
          <SelectTrigger className="mt-1 h-8 text-sm">
            <SelectValue placeholder="Select carrier" />
          </SelectTrigger>
          <SelectContent>
            {CARRIERS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs">Tracking Number</Label>
        <Input
          {...form.register("trackingNumber")}
          placeholder="1Z999AA10123456784"
          className="mt-1 h-8 text-sm"
        />
      </div>

      {carrierValue === "other" && (
        <div>
          <Label className="text-xs">Tracking URL</Label>
          <Input
            {...form.register("trackingUrl")}
            placeholder="https://..."
            className="mt-1 h-8 text-sm"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : null}
          {submitLabel}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
