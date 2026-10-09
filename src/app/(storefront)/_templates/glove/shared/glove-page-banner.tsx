"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import { GLOVE_PAGE_BANNER_DEFAULT } from "./glove-page-banner-default";

const GlovePageBannerContext = createContext<string>(GLOVE_PAGE_BANNER_DEFAULT);

/**
 * Carries the resolved "Inner page banner image" field from GloveLayout down
 * to every `GloveTitleBand variant="banner"`, so pages don't each resolve it.
 * A blank saved value falls back to the built-in banner.
 */
export function GlovePageBannerProvider({
  src,
  children,
}: {
  src: string;
  children: ReactNode;
}) {
  return (
    <GlovePageBannerContext.Provider
      value={src.trim() || GLOVE_PAGE_BANNER_DEFAULT}
    >
      {children}
    </GlovePageBannerContext.Provider>
  );
}

export function useGlovePageBanner(): string {
  return useContext(GlovePageBannerContext);
}
