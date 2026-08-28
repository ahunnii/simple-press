"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

/**
 * Mirrors `order-status-lookup-form.tsx` field-for-field: a single email
 * field posts to `subscription.requestManageLinks`, which is deliberately
 * opaque — it always resolves the same "check your email" message whether or
 * not the address has any subscriptions on this store, so this form can
 * never be used to probe who has a subscription. A rate-limit (or other
 * unexpected) error is the one case that surfaces its own message.
 */
export function SubscriptionLookupForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = api.subscription.requestManageLinks.useMutation(
    {
      onSuccess: () => {
        setSubmitted(true);
        setError(null);
      },
      onError: (err) => {
        setError(
          err.message || "Something went wrong. Please try again later.",
        );
      },
    },
  );

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius)] border border-[#e8e8e8] p-8 text-center"
      >
        <h2 className="mb-2 text-lg font-medium tracking-tight">
          Check your email
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[#6b6b6b]">
          If we found subscriptions for that email, we&apos;ve sent the links.
          It may take a few minutes to arrive.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 inline-flex items-center border-b border-current pb-0.5 text-sm font-medium transition-opacity hover:opacity-70"
        >
          Look up another email
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutate({ email });
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="subscription-lookup-email"
          className="text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
        >
          Email address
        </label>
        <input
          id="subscription-lookup-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-[var(--radius)] border border-[#e8e8e8] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[#0a0a0a]"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !email}
        className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Email me my subscription links"}
      </button>
    </form>
  );
}
