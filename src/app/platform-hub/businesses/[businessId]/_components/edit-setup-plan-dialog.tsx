"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import type {
  BusinessTypeId,
  ResolvedSetupPlan,
  SetupSteps,
} from "~/lib/admin/setup-plan";
import { FEATURE_PRESETS, SETUP_PRESETS } from "~/lib/admin/setup-plan";
import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";

import {
  BusinessTypePicker,
  SetupStepLevelList,
} from "../../../_components/setup-plan-fields";

type Props = {
  businessId: string;
  plan: ResolvedSetupPlan;
  /** Resolved feature flags (defaults + overrides). */
  flags: Record<string, boolean>;
  /** The store already finished setup once (launch latch set). */
  launched: boolean;
};

export function EditSetupPlanDialog({
  businessId,
  plan,
  flags,
  launched,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // `null` = a legacy store with no type picked yet; a type is required to save.
  const [businessType, setBusinessType] = useState<BusinessTypeId | null>(
    plan.businessType,
  );
  const [steps, setSteps] = useState<SetupSteps>(plan.steps);
  const [applyFeatureDefaults, setApplyFeatureDefaults] = useState(false);

  // Flags the type's defaults would flip from their current value.
  const flagChanges = businessType
    ? Object.entries(FEATURE_PRESETS[businessType]).filter(
        ([key, value]) => (flags[key] ?? false) !== value,
      )
    : [];

  // Effective flags if saved now: current flags, plus the type's defaults when
  // opted in, then dependency cascades. A step whose feature ends up off is
  // hidden from the owner whatever its level.
  const effectiveFlags = {
    ...getDefaultFlags(),
    ...flags,
    ...(applyFeatureDefaults && businessType
      ? FEATURE_PRESETS[businessType]
      : {}),
  };
  const disabledByDependency = getDisabledDueToDependency(effectiveFlags);
  const isFeatureOff = (key: string) =>
    effectiveFlags[key] === false || disabledByDependency.has(key);

  const setSetupPlan = api.platformBusiness.setSetupPlan.useMutation({
    onSuccess: () => {
      toast.success("Setup checklist saved");
      setOpen(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save setup checklist");
    },
  });

  // Reseed from the latest server values every time the dialog opens so a
  // cancelled edit never leaves stale choices behind.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setBusinessType(plan.businessType);
      setSteps(plan.steps);
      setApplyFeatureDefaults(false);
    }
    setOpen(next);
  };

  // Changing the type re-fills the levels, overwriting any edits.
  const handleTypeChange = (type: BusinessTypeId) => {
    setBusinessType(type);
    setSteps({ ...SETUP_PRESETS[type] });
  };

  const handleSave = () => {
    if (!businessType) return;
    setSetupPlan.mutate({
      businessId,
      businessType,
      setupSteps: steps,
      applyFeatureDefaults,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit setup checklist</DialogTitle>
          <DialogDescription>
            The business type sets which steps the owner sees. Required steps
            gate their setup; optional ones show as suggestions.
            {plan.businessType === null &&
              " This store is on the original 5-step checklist — picking a type converts it."}
            {launched &&
              " This store already finished setup, so new required steps show on the owner's checklist without sending them back to it."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Business type</h3>
            <BusinessTypePicker
              value={businessType}
              onChange={handleTypeChange}
              idPrefix="edit-business-type"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Steps</h3>
            <SetupStepLevelList
              steps={steps}
              onChange={(key, level) =>
                setSteps((prev) => ({ ...prev, [key]: level }))
              }
              isFeatureOff={isFeatureOff}
              idPrefix="edit-setup-step"
            />
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="apply-feature-defaults"
              checked={applyFeatureDefaults}
              onCheckedChange={(checked) =>
                setApplyFeatureDefaults(checked === true)
              }
              disabled={!businessType}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <Label htmlFor="apply-feature-defaults">
                Also apply this type&apos;s feature defaults
              </Label>
              <p className="text-muted-foreground text-xs">
                {!businessType
                  ? "Pick a type first."
                  : flagChanges.length === 0
                    ? "No feature changes — this store already matches."
                    : `Would change: ${flagChanges
                        .map(
                          ([key, value]) =>
                            `${FEATURE_REGISTRY[key]?.label ?? key} ${value ? "on" : "off"}`,
                        )
                        .join(", ")}.`}
              </p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={setSetupPlan.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!businessType || setSetupPlan.isPending}
          >
            {setSetupPlan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
