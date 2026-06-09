"use client";

import { useMemo } from "react";

import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "~/lib/features/registry";

type UseFeatureFlagsOptions = {
  // Pass server-fetched flags in (avoids extra client fetch)
  flags: Record<string, boolean>;
};

export function useFeatureFlags({ flags }: UseFeatureFlagsOptions) {
  const resolved = useMemo(() => {
    const defaults = getDefaultFlags();
    const merged = { ...defaults, ...flags };
    const disabledByDependency = getDisabledDueToDependency(merged);

    return {
      flags: merged,
      disabledByDependency,

      isEnabled: (key: string): boolean => {
        if (disabledByDependency.has(key)) return false;
        return merged[key] ?? FEATURE_REGISTRY[key]?.enabledByDefault ?? false;
      },

      isDisabledByDependency: (key: string): boolean => {
        return disabledByDependency.has(key);
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
