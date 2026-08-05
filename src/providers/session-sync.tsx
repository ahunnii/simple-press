"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "nextjs-toploader/app";

import { authClient } from "~/server/better-auth/client";

/**
 * Reacts to the signed-in user changing, in the two ways this app needs.
 *
 * Mounted once, inside the tRPC `QueryClientProvider` (see `src/trpc/react.tsx`)
 * so it can reach the tRPC query cache.
 *
 * **1. Clears the tRPC query cache.** The browser QueryClient is a module-level
 * singleton that otherwise survives sign-out / sign-in in the same tab, letting
 * cached data from the previous account (orders, addresses, admin data) leak
 * into the newly-signed-in session.
 *
 * **2. Refreshes the Next.js router cache — on sign-out only.** This purges any
 * RSC payloads the App Router cached while the previous user was signed in, so
 * a Back navigation can't resurrect authenticated content.
 *
 * It deliberately does *not* refresh on sign-in:
 *
 * - It isn't needed. Every template header is a client component reading
 *   `authClient.useSession()` (see `default-header.tsx` and its 6 siblings), so
 *   they re-render on their own; and the protected server routes
 *   (`account/layout.tsx`, `require-admin-access.ts`) are dynamic, so the
 *   navigation that follows sign-in refetches them with the new cookie anyway.
 * - It actively breaks sign-in. The auth form navigates to `redirectTo` the
 *   moment the session resolves; a concurrent `router.refresh()` raced that
 *   navigation and bounced the user back to `/auth/sign-in`, which
 *   `e2e/auth.default.spec.ts` caught. Reintroducing an unconditional refresh
 *   here will fail that spec.
 *
 * Better Auth UI's legacy `AuthUIProvider` had an `onSessionChange` prop that
 * covered (2); the current library has no equivalent, so both behaviours live
 * here. Subscribing to better-auth's own `useSession` store (rather than the
 * library's TanStack query) keeps this independent of which auth UI is mounted.
 */
export function SessionSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const previousUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Wait for the session to actually resolve. `useSession` starts as
    // `data: null` while pending, so tracking before it settles would read the
    // pending->resolved transition as an account change and wipe the cache on
    // every page load for signed-in users.
    if (isPending) return;

    const currentUserId = session?.user?.id ?? null;
    const previousUserId = previousUserIdRef.current;
    previousUserIdRef.current = currentUserId;

    // `undefined` is the initial (first resolved) observation — there is no
    // previous state to have transitioned *from*, so there is nothing to clear.
    // Recording it above and bailing here also makes this effect idempotent if
    // it re-runs for an unrelated dependency change.
    if (previousUserId === undefined || previousUserId === currentUserId) return;

    // Covers sign-out (id -> null), sign-in (null -> id), and switching
    // accounts in the same tab (id -> different id). Safe in all three: it only
    // drops cached data, and nothing is mid-navigation on account of it.
    queryClient.clear();

    // Sign-out only — see the note above on why sign-in must not refresh.
    if (currentUserId === null) router.refresh();
  }, [session?.user?.id, isPending, queryClient, router]);

  return null;
}
