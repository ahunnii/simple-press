"use client";

import { createContext, useContext, useMemo, useState } from "react";

type VariantImageContextValue = {
  /** The image URL of the currently-selected variant, or null when it has none. */
  variantImageUrl: string | null;
  setVariantImageUrl: (url: string | null) => void;
};

const VariantImageContext = createContext<VariantImageContextValue | null>(
  null,
);

/**
 * Shares the selected variant's image between a template's variant selector and
 * its product gallery. Hosted once at the `shop/[slug]` route so it wraps every
 * template's product page. The variant selector publishes
 * `selectedVariant.imageUrl` here; the gallery reads it and jumps to the
 * matching gallery image.
 */
export function VariantImageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [variantImageUrl, setVariantImageUrl] = useState<string | null>(null);
  const value = useMemo(
    () => ({ variantImageUrl, setVariantImageUrl }),
    [variantImageUrl],
  );
  return (
    <VariantImageContext.Provider value={value}>
      {children}
    </VariantImageContext.Provider>
  );
}

const NOOP: VariantImageContextValue = {
  variantImageUrl: null,
  setVariantImageUrl: () => undefined,
};

/**
 * Tolerant accessor: returns a no-op value when used outside a provider (e.g. a
 * shared gallery rendered somewhere other than a product page), so consumers
 * never need to guard for a missing provider.
 */
export function useVariantImage(): VariantImageContextValue {
  return useContext(VariantImageContext) ?? NOOP;
}
