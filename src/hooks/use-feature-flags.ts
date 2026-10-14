"use client";

import { useMemo } from "react";

import { getBlockingDependencyLabels } from "~/lib/features/registry";
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

      // Labels of the DIRECT dependencies that are effectively off (explicitly
      // disabled, or themselves disabled by dependency). Empty when none.
      getBlockingLabels: (key: string): string[] =>
        getBlockingDependencyLabels(key, merged),
    };
  }, [flags]);

  return resolved;
}
