import "server-only";

import { TRPCError } from "@trpc/server";

import { formatTrpcErrorForBoundary } from "./boundary-error";

export function rethrowTrpcForErrorBoundary(err: unknown): never {
  if (err instanceof TRPCError) {
    throw new Error(formatTrpcErrorForBoundary(err.code, err.message));
  }
  throw err;
}
