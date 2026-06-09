import { type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { env } from "~/env";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error, ctx }) => {
      if (env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
        );
      }
      if (error.code === "INTERNAL_SERVER_ERROR") {
        Sentry.withScope((scope) => {
          scope.setTag("trpc.path", path ?? "unknown");
          scope.setExtra("trpc.code", error.code);
          if (ctx?.session?.user) {
            scope.setUser({
              id: ctx.session.user.id,
              email: ctx.session.user.email,
            });
          }
          Sentry.captureException(error.cause ?? error);
        });
      }
    },
  });

export { handler as GET, handler as POST };
