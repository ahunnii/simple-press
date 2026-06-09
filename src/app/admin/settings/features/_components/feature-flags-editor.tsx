"use client";

import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { toast } from "sonner";

import type { FeatureCategory } from "~/lib/features/registry";
import { CATEGORY_META, FEATURE_REGISTRY } from "~/lib/features/registry";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Badge } from "~/components/ui/badge";
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
  initialFlags: Record<string, boolean>;
};

export function FeatureFlagsEditor({ initialFlags }: Props) {
  const router = useRouter();
  const { isEnabled, isDisabledByDependency, getDependencyLabel } =
    useFeatureFlags({
      flags: initialFlags,
    });

  const toggleMutation = api.features.toggle.useMutation({
    onSuccess: () => {
      router.refresh(); // Re-fetches server data
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update feature");
    },
  });

  const handleToggle = (key: string, enabled: boolean) => {
    // Optimistic feedback
    toast.promise(toggleMutation.mutateAsync({ key, enabled }), {
      loading: `${enabled ? "Enabling" : "Disabling"} ${FEATURE_REGISTRY[key]?.label}...`,
      success: `${FEATURE_REGISTRY[key]?.label} ${enabled ? "enabled" : "disabled"}`,
      error: "Failed to update",
    });
  };

  // Group features by category
  const categories = [
    ...new Set(Object.values(FEATURE_REGISTRY).map((f) => f.category)),
  ] as FeatureCategory[];

  return (
    <TooltipProvider>
      <div className="admin-container space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Features</h1>
          <p className="mt-2 text-gray-600">
            Enable or disable features for your business. Disabled features are
            hidden from your admin panel and storefront.
          </p>
        </div>

        {categories.map((category) => {
          const meta = CATEGORY_META[category];
          const featuresInCategory = Object.values(FEATURE_REGISTRY).filter(
            (f) => f.category === category && f.ownerCanToggle,
          );

          if (featuresInCategory.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{meta.icon}</span>
                  {meta.label}
                </CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {featuresInCategory.map((feature) => {
                  const enabled = isEnabled(feature.key);
                  const blockedByDep = isDisabledByDependency(feature.key);
                  const depLabel = getDependencyLabel(feature.key);

                  return (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{feature.label}</p>
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
                                Enable &quot;{depLabel}&quot; first to use this
                                feature
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {feature.description}
                        </p>
                      </div>

                      <Switch
                        checked={enabled}
                        disabled={blockedByDep || toggleMutation.isPending}
                        onCheckedChange={(checked) =>
                          handleToggle(feature.key, checked)
                        }
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
