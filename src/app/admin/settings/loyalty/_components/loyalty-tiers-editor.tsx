"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import type { LoyaltySettingsFormValues } from "./loyalty-settings";
import type { LoyaltyTierType } from "~/lib/loyalty/constants";
import { MAX_LOYALTY_TIERS } from "~/lib/loyalty/constants";
import { describeTierReward } from "~/lib/loyalty/settings";
import { dollarsToCents } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { NumberFormField } from "~/components/inputs/number-form-field";

/**
 * Live "$5.00 off" / "15% off" preview for a tier row while the owner is
 * still typing. Deliberately lenient (never throws, just falls back to an
 * em dash) since `valueInput` is a raw, not-yet-validated string — the real
 * bounds check happens in the form schema's `superRefine` on submit.
 */
function previewTierReward(type: LoyaltyTierType, valueInput: string): string {
  if (type === "percentage") {
    const n = Number.parseInt(valueInput, 10);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return describeTierReward({ type, value: Math.min(n, 100) });
  }
  const cents = dollarsToCents(valueInput.trim() || "0");
  if (!Number.isFinite(cents) || cents <= 0) return "—";
  return describeTierReward({ type, value: cents });
}

const TYPE_OPTIONS: { value: LoyaltyTierType; label: string }[] = [
  { value: "fixed", label: "Fixed amount" },
  { value: "percentage", label: "Percentage" },
];

export function LoyaltyTiersEditor() {
  const form = useFormContext<LoyaltySettingsFormValues>();

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
  } = useFieldArray({
    control: form.control,
    name: "tiers",
  });

  const tiers = form.watch("tiers");

  return (
    <div className="space-y-4">
      {tierFields.length === 0 && (
        <p className="text-muted-foreground text-sm">
          No tiers yet — customers can earn points but have nothing to redeem
          them for.
        </p>
      )}

      {tierFields.map((tierField, index) => {
        const row = tiers[index];
        const type: LoyaltyTierType = row?.type ?? "fixed";

        return (
          <div key={tierField.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-end gap-3">
              <FormField
                control={form.control}
                name={`tiers.${index}.label`}
                render={({ field }) => (
                  <FormItem className="min-w-[160px] flex-1">
                    <FormLabel className="text-xs">Label</FormLabel>
                    <FormControl>
                      <Input placeholder="$5 off your order" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <NumberFormField
                form={form}
                name={`tiers.${index}.pointsCost`}
                label="Points cost"
                min={1}
                className="w-32"
              />

              <FormField
                control={form.control}
                name={`tiers.${index}.type`}
                render={({ field }) => (
                  <FormItem className="w-40">
                    <FormLabel className="text-xs">Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`tiers.${index}.valueInput`}
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel className="text-xs">
                      {type === "percentage" ? "Percent off" : "Amount off"}
                    </FormLabel>
                    <FormControl>
                      {type === "percentage" ? (
                        <div className="relative">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={100}
                            step={1}
                            placeholder="15"
                            className="pr-7"
                            {...field}
                          />
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                            %
                          </span>
                        </div>
                      ) : (
                        <div className="relative">
                          <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                            $
                          </span>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="5.00"
                            className="pl-6"
                            {...field}
                          />
                        </div>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`tiers.${index}.minPurchaseDollars`}
                render={({ field }) => (
                  <FormItem className="w-36">
                    <FormLabel className="text-xs">
                      Min purchase (optional)
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                          $
                        </span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="None"
                          className="pl-6"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive mb-0.5 shrink-0"
                aria-label="Remove tier"
                onClick={() => removeTier(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-muted-foreground text-xs">
              Preview: {row?.pointsCost ?? 0} pts →{" "}
              {previewTierReward(type, row?.valueInput ?? "")}
            </p>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={tierFields.length >= MAX_LOYALTY_TIERS}
        onClick={() =>
          appendTier({
            label: "",
            pointsCost: 500,
            type: "fixed",
            valueInput: "5.00",
            minPurchaseDollars: "",
          })
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add tier
      </Button>
      {tierFields.length >= MAX_LOYALTY_TIERS && (
        <p className="text-muted-foreground text-xs">
          Maximum of {MAX_LOYALTY_TIERS} tiers reached.
        </p>
      )}
    </div>
  );
}
