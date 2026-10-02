"use client";

import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/hooks/use-feature-flags";

/**
 * Whether admin upload widgets may offer "Choose from library". Reads the
 * `media` flag client-side so forms don't need it threaded down from their
 * page — `media.list` is gated server-side and throws FORBIDDEN when the flag
 * is off, so pickers must stay hidden until this returns true.
 */
export function useMediaLibraryEnabled(): boolean {
  const { data } = api.features.getFlags.useQuery();
  const { isEnabled } = useFeatureFlags({ flags: data?.flags ?? {} });
  return Boolean(data) && isEnabled("media");
}
