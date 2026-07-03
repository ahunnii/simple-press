"use client";

import { createContext, useContext, useMemo } from "react";

import { resolveFlags } from "~/lib/features/resolve-flags";

type StorefrontFlagsContextType = {
  flags: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
};

const StorefrontFlagsContext = createContext<
  StorefrontFlagsContextType | undefined
>(undefined);

export function StorefrontFlagsProvider({
  flags,
  children,
}: {
  // Raw stored overrides from Business.featureFlags (may be null/non-object).
  flags: unknown;
  children: React.ReactNode;
}) {
  const value = useMemo<StorefrontFlagsContextType>(() => {
    const { flags: resolved, isEnabled } = resolveFlags(flags);
    return { flags: resolved, isEnabled };
  }, [flags]);

  return (
    <StorefrontFlagsContext.Provider value={value}>
      {children}
    </StorefrontFlagsContext.Provider>
  );
}

// Resolving with no overrides yields registry defaults — used as the fallback
// when a shared component renders outside the provider (tests, previews).
const DEFAULT_FLAGS: StorefrontFlagsContextType = (() => {
  const { flags, isEnabled } = resolveFlags(undefined);
  return { flags, isEnabled };
})();

export function useStorefrontFlags(): StorefrontFlagsContextType {
  return useContext(StorefrontFlagsContext) ?? DEFAULT_FLAGS;
}
