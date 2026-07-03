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

  const merged = { ...getDefaultFlags(), ...overrides };
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
