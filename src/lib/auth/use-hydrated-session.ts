"use client";

import { useEffect, useState } from "react";

import { authClient } from "~/server/better-auth/client";

/**
 * `authClient.useSession()` with a hydration-safe first render.
 *
 * The raw hook reads a client-side store (useSyncExternalStore). The server
 * always renders its initial pending state, but on a slow hydration — e.g.
 * the visual editor's preview iframe, where the main thread is busy — the
 * session fetch can resolve BEFORE React hydrates. The first client render
 * then paints the signed-in menu where the server painted the pending
 * placeholder: a structural hydration mismatch that shifts every `useId`
 * after it in the tree (Next surfaces it as an unpatchable
 * "server rendered HTML didn't match" error).
 *
 * This wrapper pins the first client render to the server's pending state and
 * lets the real store state apply right after mount — the placeholder flashes
 * for one frame at most, and server/client HTML always agree.
 *
 * Use this instead of `authClient.useSession()` in any component that is
 * server-rendered (all template headers).
 */
export function useHydratedSession() {
  const { data, isPending } = authClient.useSession();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return {
    data: hydrated ? data : null,
    isPending: !hydrated || isPending,
  };
}
