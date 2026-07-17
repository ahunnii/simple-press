"use client";

import { useMemo } from "react";

import { FEATURE_REGISTRY } from "~/lib/features/registry";
import { resolveFlags } from "~/lib/features/resolve-flags";

type UseFeatureFlagsOptions = {
  // Pass server-fetched flags in (avoids extra client fetch)
  flags: Record<string, boolean>;
};

export function useFeatureFlags({ flags }: UseFeatureFlagsOptions) {
  const resolved = useMemo(() => {
    const {
      flags: merged,
      isEnabled,
      disabledByDependency,
    } = resolveFlags(flags);
    const disabledSet = new Set(disabledByDependency);

    return {
      flags: merged,
      disabledByDependency: disabledSet,

      isEnabled,

      isDisabledByDependency: (key: string): boolean => {
        return disabledSet.has(key);
      },

      getDependencyLabel: (key: string): string | undefined => {
        const feature = FEATURE_REGISTRY[key];
        if (!feature?.dependsOn) return undefined;
        const missingDep = feature.dependsOn.find((dep) => !merged[dep]);
        if (!missingDep) return undefined;
        return FEATURE_REGISTRY[missingDep]?.label;
      },
    };
  }, [flags]);

  return resolved;
}
