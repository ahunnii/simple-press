"use client";

import { useEffect, useState } from "react";

import type { Session } from "~/server/better-auth/config";
import { authClient } from "~/server/better-auth/client";

/**
 * `authClient.useSession()` with a hydration-safe first render, optionally
 * seeded with the session the server already resolved.
 *
 * Unseeded — `useHydratedSession()`:
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
 * Seeded — `useHydratedSession(initialSession)`:
 *
 * Layouts that already resolve the session server-side (`getSession()`) pass
 * it down as an `initialSession` prop. Both the SSR pass and the first client
 * render return that seed verbatim: it is server truth serialized into the RSC
 * payload, so both sides render identical markup and there is nothing to
 * mismatch. That buys back what the pending placeholder costs — a signed-in
 * shopper's header arrives correct instead of showing "Sign In" for the length
 * of the client session fetch (which on a cold load is the whole first paint).
 *
 * The seed keeps answering after hydration for as long as the client store is
 * still pending, so there is no flash on the handoff either. Once the store
 * settles it wins outright — that is what keeps a sign-out (or a sign-in in
 * another tab) from needing a hard refresh to show up. `isPending` is never
 * true in this mode: with server truth in hand there is nothing to wait for.
 *
 * In BOTH modes the first client render must equal the SSR render — that is
 * the whole contract here. Anything that lets them diverge (reading the store
 * before `hydrated` flips, deriving the seed from something client-only)
 * reintroduces the mismatch described above.
 *
 * Use this instead of `authClient.useSession()` in any component that is
 * server-rendered (all template headers).
 */
export function useHydratedSession(initialSession?: Session | null) {
  const { data, isPending } = authClient.useSession();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Seeded. `!== undefined` rather than a truthiness check: a seed of `null`
  // is a real answer ("the server says signed out"), not a missing one.
  if (initialSession !== undefined) {
    return {
      data: hydrated && !isPending ? data : initialSession,
      isPending: false,
    };
  }

  return {
    data: hydrated ? data : null,
    isPending: !hydrated || isPending,
  };
}
