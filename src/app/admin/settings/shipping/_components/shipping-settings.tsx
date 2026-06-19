"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ShippingFormValues, ZoneWeightFormValues } from "~/lib/validators/shipping";
import type { RouterOutputs } from "~/trpc/react";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { shippingFormSchema, zoneWeightFormSchema } from "~/lib/validators/shipping";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";

import { ZoneWeightEditor } from "./zone-weight-editor";

type Business = NonNullable<RouterOutputs["business"]["getWith"]>;

type Props = {
  business: Business;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: hydrate ZoneWeightFormValues from saved business data
// ─────────────────────────────────────────────────────────────────────────────

type WeightTierRaw = { label: string; minLb: number; maxLb: number | null };

function hydrateZoneWeightDefaults(business: Business): ZoneWeightFormValues {
  // If the business has saved zone_weight config, hydrate from it.
  const savedTiers = business.shippingWeightTiers as WeightTierRaw[] | null | undefined;
  const savedZones = (business as unknown as {
    zones?: Array<{
      name: string;
      states: string[];
      sortOrder: number;
      rates: Array<{ tierIndex: number; priceCents: number }>;
    }>;
  }).zones;

  if (
    business.originState &&
    savedTiers &&
    savedTiers.length > 0 &&
    savedZones &&
    savedZones.length > 0
  ) {
    return {
      originState: business.originState,
      weightTiers: savedTiers,
      zones: savedZones
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((z) => ({
          name: z.name,
          states: z.states,
          rateDollars: Object.fromEntries(
            z.rates.map((r) => [
              String(r.tierIndex),
              centsToDollarsString(r.priceCents),
            ]),
          ),
        })),
      fallbackRateDollars: centsToDollarsString(
        business.shippingFallbackRate ?? 0,
      ),
      freeShippingThresholdDollars: centsToDollarsString(
        business.freeShippingThreshold ?? null,
      ),
      defaultItemWeightLb: business.shippingDefaultItemWeightLb ?? 0,
    };
  }

  // Blank defaults — owner must auto-generate or fill manually
  return {
    originState: business.originState ?? "",
    weightTiers: [],
    zones: [],
    fallbackRateDollars: "",
    freeShippingThresholdDollars: "",
    defaultItemWeightLb: 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function ShippingSettings({ business }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const formRef = useRef<HTMLFormElement>(null);

  // ── Mode / flat-rate form ─────────────────────────────────────────────────
  // Guard against zone_weight — that mode has its own zoneForm.
  const t = business.shippingType;
  const legacyShippingType: ShippingFormValues["shippingType"] =
    t === "free" || t === "flat_rate" || t === "flat_rate_with_threshold"
      ? t
      : "free";

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      shippingType: legacyShippingType,
      shippingFlatRateDollars: centsToDollarsString(business.shippingFlatRate),
      freeShippingThresholdDollars: centsToDollarsString(
        business.freeShippingThreshold,
      ),
      offersInStorePickup: business.offersInStorePickup ?? false,
    },
  });

  const shippingType = form.watch("shippingType");

  // ── Zone + weight form ────────────────────────────────────────────────────
  const zoneForm = useForm<ZoneWeightFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    resolver: zodResolver(zoneWeightFormSchema) as any,
    defaultValues: hydrateZoneWeightDefaults(business),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = api.business.updateShipping.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      form.reset({
        shippingType: data.business
          .shippingType as ShippingFormValues["shippingType"],
        shippingFlatRateDollars: centsToDollarsString(
          data.business.shippingFlatRate,
        ),
        freeShippingThresholdDollars: centsToDollarsString(
          data.business.freeShippingThreshold,
        ),
        offersInStorePickup: data.business.offersInStorePickup,
      });
      void utils.business.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update shipping settings");
    },
    onMutate: () => toast.loading("Saving shipping settings..."),
  });

  const saveZoneWeightMutation = api.business.saveZoneWeightShipping.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      zoneForm.reset(zoneForm.getValues());
      void utils.business.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to save zone + weight shipping");
    },
    onMutate: () => toast.loading("Saving shipping settings..."),
  });

  // ── Submit handlers ───────────────────────────────────────────────────────
  const handleFlatSubmit = async (data: ShippingFormValues): Promise<void> => {
    const flatCents =
      data.shippingType === "free"
        ? null
        : dollarsToCents(data.shippingFlatRateDollars ?? "0");
    const thresholdCents =
      data.shippingType === "flat_rate_with_threshold"
        ? dollarsToCents(data.freeShippingThresholdDollars ?? "0")
        : null;

    // data.shippingType is always a legacy type here — the zoneForm handles
    // zone_weight. Cast to satisfy the updateShipping input schema.
    const st = data.shippingType as "free" | "flat_rate" | "flat_rate_with_threshold";
    updateMutation.mutate({
      shippingType: st,
      shippingFlatRate: flatCents,
      freeShippingThreshold: thresholdCents,
      offersInStorePickup: data.offersInStorePickup,
    });
  };

  const handleZoneWeightSubmit = async (
    data: ZoneWeightFormValues,
  ): Promise<void> => {
    saveZoneWeightMutation.mutate(data);
  };

  // ── Dirty / submitting state ──────────────────────────────────────────────
  const isFlatPending = updateMutation.isPending;
  const isZonePending = saveZoneWeightMutation.isPending;
  const isSubmitting = isFlatPending || isZonePending;

  const isFlatDirty = form.formState.isDirty;
  const isZoneDirty = zoneForm.formState.isDirty;
  const isDirty =
    shippingType === "zone_weight" ? isZoneDirty : isFlatDirty;

  useKeyboardEnter(
    shippingType === "zone_weight" ? zoneForm : form,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (shippingType === "zone_weight" ? handleZoneWeightSubmit : handleFlatSubmit) as (data: any) => Promise<void>,
  );
  useDirtyForm(isDirty);

  // ── Toolbar save handler (dispatches to correct form) ─────────────────────
  const handleToolbarSave = () => {
    if (shippingType === "zone_weight") {
      void zoneForm.handleSubmit(handleZoneWeightSubmit)();
    } else {
      void form.handleSubmit(handleFlatSubmit)();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shared toolbar */}
      <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Shipping Settings</h1>
            <span
              className={`admin-status-badge ${
                isDirty ? "isDirty" : "isPublished"
              }`}
            >
              {isDirty ? "Unsaved Changes" : "Saved"}
            </span>
          </div>
        </div>
        <div className="toolbar-actions">
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={handleToolbarSave}
          >
            {isSubmitting ? (
              <>
                <span className="saving-indicator" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="admin-container">
        <div className="space-y-6">
          {/* Mode selector card — always uses the flat-rate form for the radio */}
          <Form {...form}>
            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault();
                handleToolbarSave();
              }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Shipping</CardTitle>
                  <CardDescription>
                    How you charge for delivery and whether customers can pick up
                    in store.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="shippingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipping charges</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col gap-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="free" id="ship-free" />
                              <Label
                                htmlFor="ship-free"
                                className="font-normal"
                              >
                                Free shipping (all orders)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="flat_rate"
                                id="ship-flat"
                              />
                              <Label
                                htmlFor="ship-flat"
                                className="font-normal"
                              >
                                Flat rate shipping
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="flat_rate_with_threshold"
                                id="ship-threshold"
                              />
                              <Label
                                htmlFor="ship-threshold"
                                className="font-normal"
                              >
                                Flat rate — free when order subtotal reaches a
                                threshold
                              </Label>
                            </div>
                            <div className="flex items-start space-x-2">
                              <RadioGroupItem
                                value="zone_weight"
                                id="ship-zone-weight"
                                className="mt-0.5"
                              />
                              <div>
                                <Label
                                  htmlFor="ship-zone-weight"
                                  className="font-normal"
                                >
                                  Zone + weight rates
                                </Label>
                                <p className="text-muted-foreground mt-0.5 text-sm">
                                  Destination-aware pricing based on distance
                                  zones and package weight. Best for orders that
                                  vary widely in size.
                                </p>
                              </div>
                            </div>
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {(shippingType === "flat_rate" ||
                    shippingType === "flat_rate_with_threshold") && (
                    <FormField
                      control={form.control}
                      name="shippingFlatRateDollars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Flat shipping rate (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                $
                              </span>
                              <Input
                                type="text"
                                inputMode="decimal"
                                placeholder="5.99"
                                className="pl-7"
                                {...field}
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  {shippingType === "flat_rate_with_threshold" && (
                    <FormField
                      control={form.control}
                      name="freeShippingThresholdDollars"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Free shipping when subtotal reaches (USD)
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="35.00"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="offersInStorePickup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            In-store pickup
                          </FormLabel>
                          <p className="text-muted-foreground text-sm">
                            Let customers choose pickup at checkout (no shipping
                            charge).
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>

          {/* Zone + weight matrix editor — mounted when mode is zone_weight */}
          {shippingType === "zone_weight" && (
            <Form {...zoneForm}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void zoneForm.handleSubmit(handleZoneWeightSubmit)();
                }}
              >
                <ZoneWeightEditor />
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
