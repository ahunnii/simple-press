import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

/**
 * tRPC error codes that represent a permanent/unrecoverable failure for the
 * given request — retrying with the same input will never succeed, so we
 * shouldn't burn extra requests or delay the error UI on these.
 */
const NON_RETRYABLE_TRPC_CODES = new Set([
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "BAD_REQUEST",
  "METHOD_NOT_SUPPORTED",
  "TIMEOUT",
  "CONFLICT",
  "PRECONDITION_FAILED",
  "PAYLOAD_TOO_LARGE",
  "UNPROCESSABLE_CONTENT",
  "TOO_MANY_REQUESTS",
  "CLIENT_CLOSED_REQUEST",
]);

/** Max attempts (including the first) for transient/5xx-style failures. */
const MAX_TRANSIENT_RETRIES = 3;

function getTrpcErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        retry: (failureCount, error) => {
          const code = getTrpcErrorCode(error);
          // Don't retry expected/unrecoverable tRPC errors — retrying
          // UNAUTHORIZED/FORBIDDEN/NOT_FOUND/BAD_REQUEST etc. just wastes
          // requests and delays the error UI from showing.
          if (code && NON_RETRYABLE_TRPC_CODES.has(code)) return false;
          // Everything else (network errors, 5xx/INTERNAL_SERVER_ERROR) is
          // treated as transient — retry a limited number of times.
          return failureCount < MAX_TRANSIENT_RETRIES;
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
