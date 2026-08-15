"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function OrderStatusLookupForm() {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = api.orderLookup.requestLink.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again later.");
    },
  });

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
          If we found an order matching those details, we&apos;ve sent an order
          status link to <span className="font-medium">{email}</span>. It may
          take a few minutes to arrive.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setOrderNumber("");
          }}
          className="mt-6 inline-flex items-center border-b border-current pb-0.5 text-sm font-medium transition-opacity hover:opacity-70"
        >
          Look up another order
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const parsed = Number.parseInt(orderNumber.replace(/^#/, ""), 10);
        if (Number.isNaN(parsed) || parsed <= 0) {
          setError("Please enter a valid order number, e.g. 1001.");
          return;
        }
        setError(null);
        mutate({ email, orderNumber: parsed });
      }}
      className="flex flex-col gap-5"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="order-status-email"
          className="text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
        >
          Email address
        </label>
        <input
          id="order-status-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-[var(--radius)] border border-[#e8e8e8] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[#0a0a0a]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="order-status-number"
          className="text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase"
        >
          Order number
        </label>
        <input
          id="order-status-number"
          type="text"
          inputMode="numeric"
          required
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="e.g. 1001"
          className="rounded-[var(--radius)] border border-[#e8e8e8] bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-[#0a0a0a]"
        />
        <p className="text-[12px] text-[#6b6b6b]">
          You&apos;ll find it in your order confirmation email.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#dc2626]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !email || !orderNumber}
        className="inline-flex items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Email me my order status link"}
      </button>
    </form>
  );
}
