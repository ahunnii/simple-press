"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";

import type { DonationLabel } from "~/lib/donations/label";
import {
  MAX_DONATION_CENTS,
  MAX_DONATION_MESSAGE_LENGTH,
  MAX_DONOR_NAME_LENGTH,
  MIN_DONATION_CENTS,
} from "~/lib/donations/constants";
import { centsToDollarsString, dollarsToCents, formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";

type CreateDonationSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Parses `POST /api/stripe/donations/create-session`'s response body,
 * guarding a non-JSON body the same way `readSubscriptionSessionResponse`
 * does in the subscribe form — that route is owned by a different agent, so
 * this is a small deliberate parallel rather than a shared import.
 */
async function readDonationSessionResponse(
  response: Response,
): Promise<CreateDonationSessionResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(NON_JSON_RESPONSE_MESSAGE);
  }
  try {
    return (await response.json()) as CreateDonationSessionResponse;
  } catch {
    throw new Error(NON_JSON_RESPONSE_MESSAGE);
  }
}

type Props = {
  label: DonationLabel;
  /** Preset amounts in cents — already resolved to the owner's config or the lib defaults. */
  presetAmountsCents: number[];
};

/**
 * The donation checkout form. Lets the donor pick a preset amount or type
 * their own, plus an optional name/message, then posts to
 * `/api/stripe/donations/create-session` and redirects to the returned
 * Stripe Checkout URL — the same redirect-on-success / banner-on-failure
 * shape as `SubscribeForm` and `useCheckoutForm`.
 */
export function DefaultDonateForm({ label, presetAmountsCents }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    presetAmountsCents[0] ?? null,
  );
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountInputId = useId();
  const nameInputId = useId();
  const messageInputId = useId();

  const customCents = customAmount.trim() ? dollarsToCents(customAmount) : null;
  const amountCents = customCents ?? selectedPreset;

  const amountIsValid =
    amountCents !== null &&
    amountCents >= MIN_DONATION_CENTS &&
    amountCents <= MAX_DONATION_CENTS;

  function choosePreset(cents: number) {
    setSelectedPreset(cents);
    setCustomAmount("");
  }

  function onCustomAmountChange(value: string) {
    setCustomAmount(value);
    if (value.trim()) setSelectedPreset(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amountIsValid || amountCents === null) {
      setError(
        `Please enter an amount between ${formatPrice(MIN_DONATION_CENTS)} and ${formatPrice(MAX_DONATION_CENTS)}.`,
      );
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/stripe/donations/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents,
          donorName: donorName.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });

      const data = await readDonationSessionResponse(response);

      if (!response.ok || !data.sessionUrl) {
        setError(data.error ?? `Failed to start ${label.noun.toLowerCase()} checkout. Please try again.`);
        setIsProcessing(false);
        return;
      }

      window.location.href = data.sessionUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to start ${label.noun.toLowerCase()} checkout. Please try again.`,
      );
      setIsProcessing(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-6 rounded-(--radius) border border-[#e8e8e8] p-6 sm:p-8"
    >
      {error && (
        <p
          role="alert"
          className="rounded-(--radius) bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div>
        <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
          Amount
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {presetAmountsCents.map((cents) => (
            <button
              key={cents}
              type="button"
              onClick={() => choosePreset(cents)}
              aria-pressed={selectedPreset === cents && !customAmount.trim()}
              className={cn(
                "rounded-(--radius) border px-5 py-2.5 text-sm font-medium transition-colors",
                selectedPreset === cents && !customAmount.trim()
                  ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                  : "border-[#e8e8e8] text-[#0a0a0a] hover:border-[#0a0a0a]",
              )}
            >
              {formatPrice(cents)}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <label
            htmlFor={amountInputId}
            className="text-sm text-[#6b6b6b]"
          >
            Or enter a custom amount
          </label>
          <div className="relative mt-1.5 max-w-[180px]">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#6b6b6b]">
              $
            </span>
            <input
              id={amountInputId}
              type="number"
              inputMode="decimal"
              min={MIN_DONATION_CENTS / 100}
              max={MAX_DONATION_CENTS / 100}
              step="0.01"
              value={customAmount}
              onChange={(e) => onCustomAmountChange(e.target.value)}
              placeholder={centsToDollarsString(presetAmountsCents[0] ?? null)}
              className="w-full rounded-(--radius) border border-[#e8e8e8] py-2.5 pr-3 pl-6 text-sm outline-none focus:border-[#0a0a0a]"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={nameInputId} className="text-sm text-[#6b6b6b]">
          Your name (optional)
        </label>
        <input
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
          className="mt-1.5 w-full rounded-(--radius) border border-[#e8e8e8] px-3 py-2.5 text-sm outline-none focus:border-[#0a0a0a]"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={messageInputId} className="text-sm text-[#6b6b6b]">
            Message (optional)
          </label>
          <span className="text-xs text-[#6b6b6b]">
            {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
          </span>
        </div>
        <textarea
          id={messageInputId}
          value={message}
          maxLength={MAX_DONATION_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Say a few words…"
          className="mt-1.5 w-full resize-none rounded-(--radius) border border-[#e8e8e8] px-3 py-2.5 text-sm outline-none focus:border-[#0a0a0a]"
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing || !amountIsValid}
        className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </button>
    </form>
  );
}
