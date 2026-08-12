import {
  FEATURE_REGISTRY,
  getDefaultFlags,
  getDisabledDueToDependency,
} from "./registry";

export type ResolvedFlags = {
  flags: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  disabledByDependency: string[];
};

/**
 * Resolve a business's stored feature-flag overrides against the registry.
 *
 * Client-safe (no server imports): accepts the raw Prisma Json value, which may
 * be null/undefined or a non-object, and normalizes it to overrides before
 * merging over the registry defaults. Shared by the server resolver, the tRPC
 * router, and the client hook/context so the merge + dependency-cascade
 * semantics stay in one place.
 */
export function resolveFlags(stored: unknown): ResolvedFlags {
  const overrides =
    typeof stored === "object" && stored !== null && !Array.isArray(stored)
      ? (stored as Record<string, boolean>)
      : {};

  // Drop stored keys that are no longer in the registry. Retiring a feature
  // (e.g. `storeTransfer`, which became a platform-admin tool) leaves stale
  // `true` values behind in `Business.featureFlags`; without this filter those
  // values would still merge into `flags` and satisfy `isEnabled(key)`, keeping
  // dead nav items and hub cards visible for the businesses that once enabled
  // the feature.
  const knownOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([key]) => key in FEATURE_REGISTRY),
  );

  const merged = { ...getDefaultFlags(), ...knownOverrides };
  const disabledByDependency = getDisabledDueToDependency(merged);

  const isEnabled = (key: string): boolean => {
    if (disabledByDependency.has(key)) return false;
    return merged[key] ?? FEATURE_REGISTRY[key]?.enabledByDefault ?? false;
  };

  return {
    flags: merged,
    isEnabled,
    disabledByDependency: [...disabledByDependency],
  };
}
