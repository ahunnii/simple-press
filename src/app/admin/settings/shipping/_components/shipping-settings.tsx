"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type {
  ShippingFormValues,
  ZoneWeightFormValues,
} from "~/lib/validators/shipping";
import type { RouterOutputs } from "~/trpc/react";
import type { z } from "zod";
import { COUNTRY_LABELS } from "~/lib/geo/regions";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { cn } from "~/lib/utils";
import {
  shippingFormSchema,
  zoneWeightFormSchema,
} from "~/lib/validators/shipping";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

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
  // Mode-independent settings that must persist for zone+weight businesses too.
  const offersInStorePickup = business.offersInStorePickup ?? false;
  const salesCountries = (business.salesCountries ?? []).filter(
    (c): c is "CA" | "MX" => c === "CA" || c === "MX",
  );
  const pickupLocation = business.pickupLocation ?? "";
  const pickupInstructions = business.pickupInstructions ?? "";

  // If the business has saved zone_weight config, hydrate from it.
  const savedTiers = business.shippingWeightTiers as
    | WeightTierRaw[]
    | null
    | undefined;
  const savedZones = (
    business as unknown as {
      zones?: Array<{
        name: string;
        states: string[];
        sortOrder: number;
        rates: Array<{ tierIndex: number; priceCents: number }>;
      }>;
    }
  ).zones;

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
      offersInStorePickup,
      salesCountries,
      pickupLocation,
      pickupInstructions,
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
    offersInStorePickup,
    salesCountries,
    pickupLocation,
    pickupInstructions,
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
  // The radio reflects the actual saved mode (including "zone_weight") so the
  // editor re-opens on reload. The flat-rate fields are only validated/submitted
  // for the flat_rate modes; zone_weight is handled by the separate zoneForm.
  const initialShippingType =
    business.shippingType as ShippingFormValues["shippingType"];

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      shippingType: initialShippingType,
      shippingFlatRateDollars: centsToDollarsString(business.shippingFlatRate),
      freeShippingThresholdDollars: centsToDollarsString(
        business.freeShippingThreshold,
      ),
      offersInStorePickup: business.offersInStorePickup ?? false,
      salesCountries: (business.salesCountries ?? []) as Array<"CA" | "MX">,
      pickupLocation: business.pickupLocation ?? "",
      pickupInstructions: business.pickupInstructions ?? "",
    },
  });

  const shippingType = form.watch("shippingType");
  const pickupEnabled = form.watch("offersInStorePickup");

  // ── Zone + weight form ────────────────────────────────────────────────────
  const zoneForm = useForm<
    z.input<typeof zoneWeightFormSchema>,
    unknown,
    ZoneWeightFormValues
  >({
    resolver: zodResolver(zoneWeightFormSchema),
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
        salesCountries: (data.business.salesCountries ?? []) as Array<
          "CA" | "MX"
        >,
        pickupLocation: data.business.pickupLocation ?? "",
        pickupInstructions: data.business.pickupInstructions ?? "",
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

  const saveZoneWeightMutation =
    api.business.saveZoneWeightShipping.useMutation({
      onSuccess: (data) => {
        toast.dismiss();
        toast.success(data.message);
        zoneForm.reset(zoneForm.getValues());
        // Country toggles live on the flat `form`; clear their dirty state too so
        // the toolbar returns to "Saved" after a zone+weight save.
        form.reset(form.getValues());
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
    const st = data.shippingType as
      | "free"
      | "flat_rate"
      | "flat_rate_with_threshold";
    updateMutation.mutate({
      shippingType: st,
      shippingFlatRate: flatCents,
      freeShippingThreshold: thresholdCents,
      offersInStorePickup: data.offersInStorePickup,
      salesCountries: data.salesCountries,
      pickupLocation: data.pickupLocation,
      pickupInstructions: data.pickupInstructions,
    });
  };

  const handleZoneWeightSubmit = async (
    data: ZoneWeightFormValues,
  ): Promise<void> => {
    // The in-store pickup and "Countries you sell to" toggles are bound to the
    // flat `form` (they are mode-independent), so read their current values from
    // there rather than the zoneForm copy.
    saveZoneWeightMutation.mutate({
      ...data,
      offersInStorePickup: form.getValues("offersInStorePickup"),
      salesCountries: form.getValues("salesCountries"),
      pickupLocation: form.getValues("pickupLocation"),
      pickupInstructions: form.getValues("pickupInstructions"),
    });
  };

  // ── Dirty / submitting state ──────────────────────────────────────────────
  const isFlatPending = updateMutation.isPending;
  const isZonePending = saveZoneWeightMutation.isPending;
  const isSubmitting = isFlatPending || isZonePending;

  const isFlatDirty = form.formState.isDirty;
  const isZoneDirty = zoneForm.formState.isDirty;
  // In zone_weight mode the country toggles still live on the flat `form`, so
  // a country change must also count as dirty / be saved by the toolbar.
  const isDirty =
    shippingType === "zone_weight" ? isZoneDirty || isFlatDirty : isFlatDirty;

  useKeyboardEnter(
    shippingType === "zone_weight" ? zoneForm : form,

    (shippingType === "zone_weight"
      ? handleZoneWeightSubmit
      : handleFlatSubmit) as (
      data: ShippingFormValues | ZoneWeightFormValues,
    ) => Promise<void>,
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
    <div className="bg-muted min-h-screen">
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
                    How you charge for delivery and whether customers can pick
                    up in store.
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
                              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
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

                  {pickupEnabled && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <FormField
                        control={form.control}
                        name="pickupLocation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pickup location</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="123 Main St, Detroit, MI 48201"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Leave blank to use your business address.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="pickupInstructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Pickup hours &amp; instructions
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Mon–Fri 10am–6pm. Ring the bell at the side entrance."
                                rows={3}
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Shown to customers at checkout and in their
                              confirmation email.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <p className="text-base font-medium">
                        Countries you sell to
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Choose which countries appear as shipping destinations
                        at checkout.
                      </p>
                    </div>

                    {/* USA — always enabled */}
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {COUNTRY_LABELS.US}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Always available as a shipping destination.
                        </p>
                      </div>
                      <Switch checked disabled />
                    </div>

                    {/* Canada */}
                    <FormField
                      control={form.control}
                      name="salesCountries"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">
                              {COUNTRY_LABELS.CA}
                            </FormLabel>
                            <p className="text-muted-foreground text-sm">
                              Show this country as a shipping option at
                              checkout.
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value.includes("CA")}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...field.value, "CA" as const]
                                  : field.value.filter((c) => c !== "CA");
                                field.onChange(next);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Mexico */}
                    <FormField
                      control={form.control}
                      name="salesCountries"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-sm font-medium">
                              {COUNTRY_LABELS.MX}
                            </FormLabel>
                            <p className="text-muted-foreground text-sm">
                              Show this country as a shipping option at
                              checkout.
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value.includes("MX")}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...field.value, "MX" as const]
                                  : field.value.filter((c) => c !== "MX");
                                field.onChange(next);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
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
