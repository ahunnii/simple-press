"use client";

import { useCallback } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

import type { ZoneWeightFormValues } from "~/lib/validators/shipping";
import {
  generateDefaultZoneWeightConfig,
  STATE_REGION_MAP,
} from "~/lib/shipping-zones-default";
import { centsToDollarsString } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// All US states + DC as a sorted list of [code, name] pairs
const US_STATES: [string, string][] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DC", "Washington DC"],
  ["DE", "Delaware"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
];

const ALL_STATE_CODES = Object.keys(STATE_REGION_MAP).sort();

export function ZoneWeightEditor() {
  const form = useFormContext<ZoneWeightFormValues>();

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({
    control: form.control,
    name: "weightTiers",
  });

  const {
    fields: zoneFields,
    append: appendZone,
    remove: removeZone,
  } = useFieldArray({
    control: form.control,
    name: "zones",
  });

  const originState = form.watch("originState");

  const handleAutoGenerate = useCallback(() => {
    const state = originState?.trim().toUpperCase();
    if (!state?.length || state.length !== 2) return;

    const config = generateDefaultZoneWeightConfig(state);

    // Map tiers straight across
    form.setValue("weightTiers", config.weightTiers, { shouldDirty: true });

    // Map zones: convert cents rates → dollar strings with string keys
    const mappedZones = config.zones.map((z) => ({
      name: z.name,
      states: z.states,
      rateDollars: Object.fromEntries(
        Object.entries(z.rates).map(([tierIdx, cents]) => [
          String(tierIdx),
          centsToDollarsString(cents),
        ]),
      ),
    }));
    form.setValue("zones", mappedZones, { shouldDirty: true });

    // Fallback rate
    form.setValue(
      "fallbackRateDollars",
      centsToDollarsString(config.fallbackRateCents),
      { shouldDirty: true },
    );

    // Free-shipping threshold (null → clear field)
    form.setValue("freeShippingThresholdDollars", "", { shouldDirty: true });
    form.setValue("defaultItemWeightLb", 0, { shouldDirty: true });
  }, [originState, form]);

  const tiers = form.watch("weightTiers");
  const zones = form.watch("zones");

  return (
    <div className="space-y-6">
      {/* Origin + auto-generate */}
      <Card>
        <CardHeader>
          <CardTitle>Origin &amp; Starter Rates</CardTitle>
          <CardDescription>
            Select your warehouse state, then auto-generate a starting rate
            matrix you can edit zone by zone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <FormField
              control={form.control}
              name="originState"
              render={({ field }) => (
                <FormItem className="w-56">
                  <FormLabel>Origin state</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-72">
                      {US_STATES.map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name} ({code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!originState?.length || originState.length !== 2}
              onClick={handleAutoGenerate}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Auto-generate starter rates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weight tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Weight tiers</CardTitle>
          <CardDescription>
            Define the weight bands used as columns in the rate matrix. The last
            tier is open-ended (no max).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tierFields.map((tier, tierIdx) => {
            const isLast = tierIdx === tierFields.length - 1;
            return (
              <div
                key={tier.id}
                className="flex flex-wrap items-end gap-3 rounded-lg border p-3"
              >
                <FormField
                  control={form.control}
                  name={`weightTiers.${tierIdx}.label`}
                  render={({ field }) => (
                    <FormItem className="min-w-[120px] flex-1">
                      <FormLabel className="text-xs">Label</FormLabel>
                      <FormControl>
                        <Input placeholder="0 – 5 lb" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`weightTiers.${tierIdx}.minLb`}
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel className="text-xs">Min (lb)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!isLast && (
                  <FormField
                    control={form.control}
                    name={`weightTiers.${tierIdx}.maxLb`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel className="text-xs">Max (lb)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="5"
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                {isLast && (
                  <div className="w-24">
                    <Label className="text-xs">Max (lb)</Label>
                    <Input
                      disabled
                      value="No limit"
                      className="text-muted-foreground"
                    />
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive mb-0.5 shrink-0"
                  aria-label="Remove tier"
                  disabled={tierFields.length <= 1}
                  onClick={() => {
                    removeTier(tierIdx);
                    // When a tier column is removed, also prune that key from
                    // every zone's rateDollars to keep them consistent
                    const currentZones = form.getValues("zones");
                    currentZones.forEach((zone, zIdx) => {
                      const updated = { ...zone.rateDollars };
                      delete updated[String(tierIdx)];
                      // Re-index keys above removed index
                      const reIndexed: Record<string, string> = {};
                      Object.entries(updated).forEach(([k, v]) => {
                        const n = Number(k);
                        reIndexed[String(n > tierIdx ? n - 1 : n)] = v ?? "";
                      });
                      form.setValue(`zones.${zIdx}.rateDollars`, reIndexed, {
                        shouldDirty: true,
                      });
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const lastTier = tiers[tiers.length - 1];
              const newMin = lastTier?.maxLb ?? 0;
              // Make the previous last tier bounded
              if (lastTier?.maxLb === null && tiers.length > 0) {
                form.setValue(
                  `weightTiers.${tiers.length - 1}.maxLb`,
                  newMin + 10,
                  { shouldDirty: true },
                );
              }
              appendTier({
                label: `${newMin} lb+`,
                minLb: newMin,
                maxLb: null,
              });
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add tier
          </Button>
        </CardContent>
      </Card>

      {/* Rate matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Zone rate matrix</CardTitle>
          <CardDescription>
            Each row is a shipping zone (a group of states). Prices are in USD.
            Rates apply when the order weight falls within that tier column.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zoneFields.map((zone, zoneIdx) => (
            <div key={zone.id} className="rounded-lg border p-4 space-y-4">
              {/* Zone header row */}
              <div className="flex items-start gap-3">
                <FormField
                  control={form.control}
                  name={`zones.${zoneIdx}.name`}
                  render={({ field }) => (
                    <FormItem className="min-w-[140px] flex-1">
                      <FormLabel className="text-xs">Zone name</FormLabel>
                      <FormControl>
                        <Input placeholder="Zone 1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive mt-5 shrink-0"
                  aria-label="Remove zone"
                  onClick={() => removeZone(zoneIdx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Rate cells — one input per tier */}
              {tiers.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Rates by weight tier (USD)
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {tiers.map((tier, tierIdx) => (
                      <FormField
                        key={`${zone.id}-tier-${tierIdx}`}
                        control={form.control}
                        name={`zones.${zoneIdx}.rateDollars.${String(tierIdx)}`}
                        render={({ field }) => (
                          <FormItem className="w-28">
                            <FormLabel className="text-xs font-normal text-muted-foreground">
                              {tier.label ?? `Tier ${tierIdx + 1}`}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
                                  $
                                </span>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0.00"
                                  className="pl-6"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* State checklist */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  States in this zone
                </Label>
                <FormField
                  control={form.control}
                  name={`zones.${zoneIdx}.states`}
                  render={({ field }) => {
                    const selected = new Set(
                      (field.value ?? []).map((s: string) => s.toUpperCase()),
                    );
                    // Determine which states are already claimed by OTHER zones
                    const claimedElsewhere = new Set<string>();
                    zones.forEach((z, idx) => {
                      if (idx === zoneIdx) return;
                      (z.states ?? []).forEach((s) =>
                        claimedElsewhere.add(s.toUpperCase()),
                      );
                    });

                    return (
                      <FormItem>
                        <div className="grid grid-cols-3 gap-1 rounded-md border p-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                          {ALL_STATE_CODES.map((code) => {
                            const isChecked = selected.has(code);
                            const isClaimed =
                              !isChecked && claimedElsewhere.has(code);
                            return (
                              <label
                                key={code}
                                className={`flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors ${
                                  isChecked
                                    ? "bg-primary/10 text-primary font-medium"
                                    : isClaimed
                                      ? "cursor-not-allowed text-muted-foreground/40 line-through"
                                      : "hover:bg-muted"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={isChecked}
                                  disabled={isClaimed}
                                  onChange={() => {
                                    if (isClaimed) return;
                                    const next = new Set(selected);
                                    if (next.has(code)) next.delete(code);
                                    else next.add(code);
                                    field.onChange([...next]);
                                  }}
                                />
                                <span
                                  className={`inline-block h-3 w-3 shrink-0 rounded-sm border ${
                                    isChecked
                                      ? "bg-primary border-primary"
                                      : "border-input"
                                  }`}
                                  aria-hidden="true"
                                />
                                {code}
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              appendZone({
                name: `Zone ${zoneFields.length + 1}`,
                states: [],
                rateDollars: Object.fromEntries(
                  tiers.map((_, i) => [String(i), ""]),
                ),
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Add zone
          </Button>
        </CardContent>
      </Card>

      {/* Fallback, threshold, default weight */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback &amp; defaults</CardTitle>
          <CardDescription>
            Applied when the destination state matches no zone (e.g. territories
            or international), and the assumed weight for products without a
            weight set.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="fallbackRateDollars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fallback shipping rate (USD)</FormLabel>
                <FormControl>
                  <div className="relative max-w-xs">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="19.99"
                      className="pl-7"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Used when the destination has no matching zone.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="freeShippingThresholdDollars"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Free shipping threshold (USD) — optional
                </FormLabel>
                <FormControl>
                  <div className="relative max-w-xs">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground pointer-events-none">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Leave blank to disable"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  When the order subtotal meets or exceeds this amount, shipping
                  is free.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultItemWeightLb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default item weight (lb)</FormLabel>
                <FormControl>
                  <div className="max-w-xs">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Weight assumed for any product that has no weight set. Use a
                  conservative estimate to avoid undercharging on heavy orders.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
