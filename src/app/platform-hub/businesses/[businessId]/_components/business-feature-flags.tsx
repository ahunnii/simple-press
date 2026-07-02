"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Lock } from "lucide-react";
import { toast } from "sonner";

import type { FeatureCategory } from "~/lib/features/registry";
import {
  CATEGORY_META,
  FEATURE_REGISTRY,
  getDisabledDueToDependency,
} from "~/lib/features/registry";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

type Props = {
  businessId: string;
  initialFlags: Record<string, boolean>;
};

export function BusinessFeatureFlags({ businessId, initialFlags }: Props) {
  const router = useRouter();

  const [draft, setDraft] = useState<Record<string, boolean>>(initialFlags);

  const disabledByDependency = useMemo(
    () => getDisabledDueToDependency(draft),
    [draft],
  );

  const isDirty = useMemo(
    () =>
      Object.keys(FEATURE_REGISTRY).some(
        (key) => (draft[key] ?? false) !== (initialFlags[key] ?? false),
      ),
    [draft, initialFlags],
  );

  const setFlagsMutation = api.platform.setBusinessFlags.useMutation({
    onSuccess: () => {
      toast.success("Feature flags saved");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save feature flags");
    },
  });

  const getDependencyLabel = (key: string): string | undefined => {
    const feature = FEATURE_REGISTRY[key];
    if (!feature?.dependsOn) return undefined;
    const missingDep = feature.dependsOn.find((dep) => !draft[dep]);
    if (!missingDep) return undefined;
    return FEATURE_REGISTRY[missingDep]?.label;
  };

  const handleToggle = (key: string, enabled: boolean) => {
    setDraft((prev) => ({ ...prev, [key]: enabled }));
  };

  const handleSave = () => {
    setFlagsMutation.mutate({ businessId, flags: draft });
  };

  const categories = [
    ...new Set(Object.values(FEATURE_REGISTRY).map((f) => f.category)),
  ] as FeatureCategory[];

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Enable or disable features for this business. Changes apply
                after saving.
              </CardDescription>
            </div>
            <Button
              onClick={handleSave}
              disabled={!isDirty || setFlagsMutation.isPending}
            >
              {setFlagsMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {categories.map((category) => {
            const meta = CATEGORY_META[category];
            const featuresInCategory = Object.values(FEATURE_REGISTRY).filter(
              (f) => f.category === category,
            );

            if (featuresInCategory.length === 0) return null;

            return (
              <div key={category}>
                <div className="mb-1 flex items-center gap-2">
                  <span aria-hidden>{meta.icon}</span>
                  <h3 className="text-sm font-semibold">{meta.label}</h3>
                </div>
                <p className="text-muted-foreground mb-3 text-sm">
                  {meta.description}
                </p>
                <div className="divide-y rounded-md border px-4">
                  {featuresInCategory.map((feature) => {
                    const blockedByDep = disabledByDependency.has(feature.key);
                    const depLabel = getDependencyLabel(feature.key);
                    const enabled =
                      !blockedByDep && (draft[feature.key] ?? false);

                    return (
                      <div
                        key={feature.key}
                        className="flex items-center justify-between py-4"
                      >
                        <div className="min-w-0 flex-1 pr-6">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {feature.label}
                            </p>
                            {!feature.ownerCanToggle && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 text-xs"
                                  >
                                    <Lock className="h-3 w-3" />
                                    Platform only
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Business owners cannot toggle this feature
                                  themselves
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {blockedByDep && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="gap-1 text-xs"
                                  >
                                    <Info className="h-3 w-3" />
                                    Requires {depLabel}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Enable &quot;{depLabel}&quot; first to use
                                  this feature
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <p className="text-muted-foreground mt-0.5 text-sm">
                            {feature.description}
                          </p>
                        </div>

                        <Switch
                          checked={enabled}
                          disabled={blockedByDep || setFlagsMutation.isPending}
                          onCheckedChange={(checked) =>
                            handleToggle(feature.key, checked)
                          }
                          aria-label={`Toggle ${feature.label}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
