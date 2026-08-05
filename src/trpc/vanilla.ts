import { createTRPCClient, httpBatchStreamLink } from "@trpc/client";
import SuperJSON from "superjson";

import type { AppRouter } from "~/server/api/root";

/**
 * Standalone tRPC client for browser code that runs outside a React render.
 *
 * `~/trpc/react` covers components (it needs hook context and the shared query
 * cache); `~/trpc/server` covers RSC. Neither works from a plain callback — for
 * example the `avatar.delete` handler that `<AuthProvider>` invokes from its
 * own config, which is where this was first needed.
 *
 * Prefer the React client inside components: results here are not cached and
 * do not participate in query invalidation.
 */
export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: SuperJSON,
      url: getBaseUrl() + "/api/trpc",
      headers: () => ({ "x-trpc-source": "vanilla" }),
    }),
  ],
});

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
