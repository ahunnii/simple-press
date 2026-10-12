"use client";

import type * as React from "react";

import type {
  BusinessTypeId,
  SetupStepKey,
  SetupStepLevel,
  SetupSteps,
} from "~/lib/admin/setup-plan";
import {
  BUSINESS_TYPE_IDS,
  BUSINESS_TYPES,
  SETUP_STEP_CATALOG,
} from "~/lib/admin/setup-plan";
import { FEATURE_REGISTRY } from "~/lib/features/registry";
import { cn } from "~/lib/utils";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// Shared by the create-business dialog and the business page's setup-plan
// editor, so both pick a type and set per-step levels the same way.

const LEVEL_OPTIONS: { value: SetupStepLevel; label: string }[] = [
  { value: "required", label: "Required" },
  { value: "optional", label: "Optional" },
  { value: "off", label: "Off" },
];

type BusinessTypePickerProps = Omit<
  React.ComponentProps<typeof RadioGroup>,
  "value" | "onChange" | "onValueChange"
> & {
  /** `null` = nothing selected (a legacy store being converted). */
  value: BusinessTypeId | null;
  onChange: (type: BusinessTypeId) => void;
  /** Keeps radio ids unique when two pickers could be mounted. */
  idPrefix: string;
};

/** Four radio cards, one per business type. */
export function BusinessTypePicker({
  value,
  onChange,
  idPrefix,
  ...props
}: BusinessTypePickerProps) {
  return (
    <RadioGroup
      {...props}
      value={value ?? ""}
      onValueChange={(next) => onChange(next as BusinessTypeId)}
      className="grid gap-2 sm:grid-cols-2"
    >
      {BUSINESS_TYPE_IDS.map((type) => (
        <label
          key={type}
          htmlFor={`${idPrefix}-${type}`}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
            value === type
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50",
          )}
        >
          <RadioGroupItem
            value={type}
            id={`${idPrefix}-${type}`}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <div className="text-sm font-medium">
              {BUSINESS_TYPES[type].label}
            </div>
            <p className="text-muted-foreground text-xs">
              {BUSINESS_TYPES[type].description}
            </p>
          </div>
        </label>
      ))}
    </RadioGroup>
  );
}

type SetupStepLevelListProps = {
  steps: Partial<SetupSteps>;
  onChange: (key: SetupStepKey, level: SetupStepLevel) => void;
  /** Whether a feature ends up off; its steps are hidden from the owner. */
  isFeatureOff: (feature: string) => boolean;
  idPrefix: string;
};

/** One Required / Optional / Off select per catalog step. */
export function SetupStepLevelList({
  steps,
  onChange,
  isFeatureOff,
  idPrefix,
}: SetupStepLevelListProps) {
  return (
    <div className="divide-y rounded-lg border">
      {SETUP_STEP_CATALOG.map((step) => {
        const blocked = step.feature ? isFeatureOff(step.feature) : false;
        const featureLabel = step.feature
          ? (FEATURE_REGISTRY[step.feature]?.label ?? step.feature)
          : "";
        const id = `${idPrefix}-${step.key}`;
        return (
          <div
            key={step.key}
            className="flex flex-row items-center justify-between gap-3 px-3 py-2"
          >
            <div className="min-w-0">
              <Label
                htmlFor={id}
                className={cn(
                  "font-normal",
                  blocked && "text-muted-foreground",
                )}
              >
                {step.label}
              </Label>
              {blocked && (
                <p className="text-muted-foreground text-xs">
                  Needs {featureLabel} — hidden from the owner
                </p>
              )}
            </div>
            <Select
              value={steps[step.key]}
              onValueChange={(level) =>
                onChange(step.key, level as SetupStepLevel)
              }
              disabled={blocked}
            >
              <SelectTrigger id={id} size="sm" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
