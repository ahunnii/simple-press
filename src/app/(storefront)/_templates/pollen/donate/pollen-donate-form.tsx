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
import {
  centsToDollarsString,
  dollarsToCents,
  formatPrice,
} from "~/lib/prices";
import { cn } from "~/lib/utils";

type CreateDonationSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Parses `POST /api/stripe/donations/create-session`'s response body. Same
 * guard as `DefaultDonateForm` (that route is owned by a different agent, so
 * this is a small deliberate parallel rather than a shared import — see the
 * comment there).
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

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-[#215935] focus-visible:ring-offset-2 focus-visible:outline-none";

const LABEL = "block text-sm font-medium text-[#374151]";

const INPUT =
  "w-full rounded-xl border border-[#d1d5db] bg-white px-4 py-2.5 text-base text-[#374151] outline-none transition-colors placeholder:text-[#6b7280] focus:border-[#215935] focus:ring-2 focus:ring-[#A8D081]/60";

type Props = {
  label: DonationLabel;
  /** Preset amounts in cents — already resolved to the owner's config or the lib defaults. */
  presetAmountsCents: number[];
};

/**
 * Pollen's styled donation checkout form. Identical logic to
 * `DefaultDonateForm` (preset/custom amount validation, cents conversion,
 * fetch shape, redirect-on-success / banner-on-failure) — only the
 * presentation is pollen's own: a rounded-2xl white card, rounded-full
 * #215935 buttons and pill presets, #A8D081/#215935 focus states.
 *
 * Rendered outside any FadeIn/reveal wrapper on purpose: a form must never
 * start hidden.
 */
export function PollenDonateForm({ label, presetAmountsCents }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    presetAmountsCents[0] ?? null,
  );
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountLabelId = useId();
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
        setError(
          data.error ??
            `Failed to start ${label.noun.toLowerCase()} checkout. Please try again.`,
        );
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
      className="flex flex-col gap-7 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm sm:p-10"
    >
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div>
        <span
          id={amountLabelId}
          className="text-sm font-semibold tracking-wider text-[#5e7747] uppercase"
        >
          Amount
        </span>
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-labelledby={amountLabelId}
        >
          {presetAmountsCents.map((cents) => {
            const selected = selectedPreset === cents && !customAmount.trim();
            return (
              <button
                key={cents}
                type="button"
                onClick={() => choosePreset(cents)}
                aria-pressed={selected}
                className={cn(
                  "min-h-11 rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors",
                  FOCUS_RING,
                  selected
                    ? "border-[#215935] bg-[#215935] text-white"
                    : "border-[#d1d5db] bg-white text-[#2a351f] hover:border-[#215935] hover:bg-[#f5f2ee]",
                )}
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <label htmlFor={amountInputId} className={LABEL}>
            Or enter a custom amount
          </label>
          <div className="relative mt-1.5 max-w-[180px]">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#6b7280]">
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
              className={cn(INPUT, "pl-8")}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={nameInputId} className={LABEL}>
          Your name (optional)
        </label>
        <input
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
          className={cn(INPUT, "mt-1.5")}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={messageInputId} className={LABEL}>
            Message (optional)
          </label>
          <span className="text-xs text-[#6b7280]" aria-hidden="true">
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
          className={cn(INPUT, "mt-1.5 resize-none")}
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing || !amountIsValid}
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-full bg-[#215935] px-8 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#1a4729] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#215935]",
          FOCUS_RING,
        )}
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </button>
    </form>
  );
}
