"use client";

import { useId, useState } from "react";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

type NotifyMeFormProps = {
  productId: string;
  /** Pass the currently selected variant id where variant selection exists. */
  variantId?: string | null;
  /** Extra classes for the root wrapper (spacing, borders, fonts…). */
  className?: string;
  /** Extra classes for the "get notified" message line. */
  messageClassName?: string;
  /** Extra classes for the email input. */
  inputClassName?: string;
  /** Extra classes for the submit button. */
  buttonClassName?: string;
  /** Override the default message line. */
  message?: string;
};

/**
 * "Notify me when it's back" signup for out-of-stock products.
 *
 * Visually neutral by default: inherits the surrounding text color, uses
 * low-opacity `currentColor` borders, and accepts class overrides so each
 * template can blend it in (same approach as `SavedAddressPicker`).
 */
export function NotifyMeForm({
  productId,
  variantId,
  className,
  messageClassName,
  inputClassName,
  buttonClassName,
  message = "Out of stock — get notified when it's back.",
}: NotifyMeFormProps) {
  const { isEnabled } = useStorefrontFlags();
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const subscribe = api.backInStock.subscribe.useMutation({
    onSuccess: () => setSubmitted(true),
  });

  if (!isEnabled("backInStock")) return null;

  if (submitted) {
    return (
      <p
        role="status"
        className={cn("text-sm", messageClassName, className)}
        style={{ margin: 0 }}
      >
        ✓ We&apos;ll email you when it&apos;s back.
      </p>
    );
  }

  return (
    <form
      className={cn("min-w-0", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim() || subscribe.isPending) return;
        subscribe.mutate({
          email: email.trim(),
          productId,
          variantId: variantId ?? undefined,
        });
      }}
    >
      <label
        htmlFor={inputId}
        className={cn("mb-2 block text-sm", messageClassName)}
      >
        {message}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={cn(
            "min-w-0 flex-1 rounded-md border border-current/30 bg-transparent px-3 py-2 text-sm placeholder:opacity-50 focus:outline-2 focus:outline-offset-1 focus:outline-current",
            inputClassName,
          )}
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className={cn(
            "shrink-0 rounded-md border border-current px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50",
            buttonClassName,
          )}
        >
          {subscribe.isPending ? "Saving…" : "Notify me"}
        </button>
      </div>
      {subscribe.isError && (
        <p className="mt-2 text-sm opacity-80" role="alert">
          {subscribe.error.data?.code === "TOO_MANY_REQUESTS"
            ? "Too many requests — please try again in a few minutes."
            : "Something went wrong. Please try again."}
        </p>
      )}
    </form>
  );
}
