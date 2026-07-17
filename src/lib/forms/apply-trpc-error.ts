import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

/**
 * Structural shape of a tRPC client error, matching what the `errorFormatter`
 * in `src/server/api/trpc.ts` produces (`ZodError.flatten()` on the cause).
 * Deliberately not `TRPCClientErrorLike<AppRouter>` so this helper works
 * against any router's mutation error without generics gymnastics.
 */
export type TrpcFormError = {
  message: string;
  data?: {
    zodError?: {
      fieldErrors?: Record<string, string[] | undefined> | null;
    } | null;
  } | null;
};

export type ApplyTrpcErrorOptions<TFieldValues extends FieldValues> = {
  /**
   * Maps a case-insensitive substring of `error.message` to a form field path.
   * Only consulted when the error has no usable `zodError.fieldErrors`
   * (tier 2). The first entry whose key is found in the message wins.
   */
  fieldMap?: Record<string, Path<TFieldValues>>;
  /**
   * Whether to fall back to `toast.error(...)` when no field could be mapped.
   * Defaults to `true`.
   */
  fallbackToast?: boolean;
  /**
   * Message shown by the fallback toast when `error.message` is empty.
   * Defaults to "Something went wrong."
   */
  fallbackMessage?: string;
};

/**
 * Maps a tRPC mutation error onto react-hook-form field errors, instead of
 * only showing a generic toast. Intended for admin form `onError` handlers:
 *
 * ```ts
 * onError: (err) =>
 *   applyTrpcErrorToForm(form, err, { fieldMap: { slug: "slug" } }),
 * ```
 *
 * Resolution order — first match wins, and at most one tier fires:
 *
 * 1. **Zod field errors** — if `error.data.zodError.fieldErrors` is present,
 *    call `form.setError(field, { type: "server", message })` for every key
 *    whose top-level segment exists in the form's current values, using the
 *    first message in that field's array. Only the first matched field is
 *    focused.
 * 2. **`options.fieldMap`** — otherwise, the first entry whose key is a
 *    case-insensitive substring of `error.message` has its mapped field set
 *    with the full server message, with focus.
 * 3. **Toast fallback** — if neither tier mapped anything and
 *    `options.fallbackToast !== false`, show
 *    `toast.error(error.message || fallbackMessage)`. No toast is shown when
 *    tier 1 or 2 matched.
 */
export function applyTrpcErrorToForm<TFieldValues extends FieldValues>(
  form: UseFormReturn<TFieldValues>,
  error: TrpcFormError,
  options?: ApplyTrpcErrorOptions<TFieldValues>,
): void {
  const fallbackToast = options?.fallbackToast ?? true;
  const fallbackMessage = options?.fallbackMessage ?? "Something went wrong.";

  // Tier 1: tRPC-formatted Zod field errors.
  const fieldErrors = error.data?.zodError?.fieldErrors;
  if (fieldErrors) {
    const formKeys = new Set(Object.keys(form.getValues()));
    let focused = false;

    for (const [field, messages] of Object.entries(fieldErrors)) {
      const message = messages?.[0];
      if (!message) continue;

      // For nested/dot-path keys, only require the top-level segment to
      // exist in the form; setError still receives the full dotted path.
      const topLevelKey = field.split(".")[0];
      if (topLevelKey === undefined || !formKeys.has(topLevelKey)) continue;

      form.setError(
        field as Path<TFieldValues>,
        { type: "server", message },
        { shouldFocus: !focused },
      );
      focused = true;
    }

    if (focused) return;
  }

  // Tier 2: case-insensitive message substring -> field map.
  if (options?.fieldMap) {
    const lowerMessage = error.message.toLowerCase();
    for (const [needle, field] of Object.entries(options.fieldMap)) {
      if (lowerMessage.includes(needle.toLowerCase())) {
        form.setError(
          field,
          { type: "server", message: error.message },
          { shouldFocus: true },
        );
        return;
      }
    }
  }

  // Tier 3: fallback toast.
  if (fallbackToast) {
    toast.error(error.message || fallbackMessage);
  }
}
