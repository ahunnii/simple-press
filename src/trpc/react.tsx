"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/root";
import { authClient } from "~/server/better-auth/client";

import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  clientQueryClientSingleton ??= createQueryClient();

  return clientQueryClientSingleton;
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  // The browser QueryClient is a module-level singleton (see
  // `clientQueryClientSingleton` above) that otherwise survives sign-out /
  // sign-in in the same tab, letting cached data from the previous account
  // (orders, addresses, admin data) leak into the newly-signed-in session.
  // `providers.tsx` already has an `onSessionChange` hook (calls
  // router.refresh()) but it lives outside this file's edit scope, so we
  // detect the same auth transition here via better-auth's `useSession` and
  // clear the query cache whenever the authenticated user id changes —
  // covers sign-out (id -> null) and switching accounts in the same tab.
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
    // Skip the initial (first resolved) observation — only react to an actual
    // transition between two known states.
    if (previousUserId !== undefined && previousUserId !== currentUserId) {
      queryClient.clear();
    }
    previousUserIdRef.current = currentUserId;
  }, [session?.user?.id, isPending, queryClient]);

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
