"use client";

import { toast } from "sonner";

/**
 * The loading-toast dance every admin write does, written once.
 *
 * A mutation opens a loading toast in `onMutate` and must dismiss THAT toast —
 * not whatever is on screen — when it settles. A bare `toast.dismiss()` clears
 * every toast including unrelated ones, so the id is threaded through tRPC's
 * mutation context.
 *
 * Usage:
 *
 * ```ts
 * const del = api.thing.delete.useMutation({
 *   onMutate: loadingToast("Deleting thing…"),
 *   onSuccess: (_data, id, context) => {
 *     dismissLoadingToast(context);
 *     toast.success("Thing deleted");
 *   },
 *   onError: (error, _id, context) => {
 *     dismissLoadingToast(context);
 *     toast.error(error.message ?? "Failed to delete thing");
 *   },
 * });
 * ```
 */

/** What `loadingToast`'s `onMutate` returns; tRPC infers it as the mutation context. */
export type LoadingToastContext = { toastId: string | number };

/** Builds the `onMutate` handler. Ignores its variables argument by design. */
export function loadingToast(message: string) {
  return (): LoadingToastContext => ({ toastId: toast.loading(message) });
}

/**
 * Dismiss the loading toast this mutation opened. `context` is `undefined` when
 * `onMutate` never ran (tRPC types it optional), hence the guard.
 */
export function dismissLoadingToast(context: LoadingToastContext | undefined) {
  if (context) toast.dismiss(context.toastId);
}
