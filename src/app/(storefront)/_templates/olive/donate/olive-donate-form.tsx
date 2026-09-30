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

import { OliveButton, OliveField, OliveInput, OliveTextarea } from "../shared";

type CreateDonationSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Parses `POST /api/stripe/donations/create-session`'s response body,
 * guarding a non-JSON body — same guard as Default's donate form.
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
 * OliveDonateForm — Default's donation checkout form, restyled in olive's
 * own controls: preset amounts as pill toggles (`aria-pressed`, the selected
 * one filled sage), then `OliveInput`/`OliveTextarea` faces for the custom
 * amount, name and message, and one primary `OliveButton` to submit.
 *
 * Behaviour is Default's, unchanged: pick a preset or type an amount, post
 * to `/api/stripe/donations/create-session`, redirect to the returned Stripe
 * Checkout URL; failures show inline in a live alert.
 *
 * Lives on an `olive-card` and is NEVER wrapped in `OliveReveal` — a form
 * must not start at opacity 0.
 */
export function OliveDonateForm({ label, presetAmountsCents }: Props) {
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

  const failureMessage = `Failed to start ${label.noun.toLowerCase()} checkout. Please try again.`;

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
        setError(data.error ?? failureMessage);
        setIsProcessing(false);
        return;
      }

      window.location.href = data.sessionUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : failureMessage);
      setIsProcessing(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="olive-card flex flex-col gap-6 p-5 sm:p-8"
    >
      {error ? (
        <p
          role="alert"
          className="text-[0.875rem] leading-snug"
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "var(--olive-error-bg)",
            border: "1px solid var(--olive-error-border)",
            borderRadius: "var(--olive-card-radius)",
            color: "var(--olive-error)",
          }}
        >
          {error}
        </p>
      ) : null}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="olive-label mb-3 p-0">Amount</legend>
        <div className="flex flex-wrap gap-2">
          {presetAmountsCents.map((cents) => {
            const pressed = selectedPreset === cents && !customAmount.trim();
            return (
              <button
                key={cents}
                type="button"
                onClick={() => choosePreset(cents)}
                aria-pressed={pressed}
                className={cn(
                  "olive-btn",
                  pressed ? "olive-btn-primary" : "olive-btn-secondary",
                )}
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor={amountInputId} className="olive-caption">
            Or enter a custom amount
          </label>
          <div className="relative max-w-[11rem]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[0.9375rem]"
              style={{ color: "var(--olive-ink-soft)" }}
            >
              $
            </span>
            <OliveInput
              id={amountInputId}
              type="number"
              inputMode="decimal"
              min={MIN_DONATION_CENTS / 100}
              max={MAX_DONATION_CENTS / 100}
              step="0.01"
              value={customAmount}
              onChange={(e) => onCustomAmountChange(e.target.value)}
              placeholder={centsToDollarsString(presetAmountsCents[0] ?? null)}
              className="w-full"
              style={{ paddingLeft: "1.75rem" }}
            />
          </div>
        </div>
      </fieldset>

      <OliveField id={nameInputId} label="Your name (optional)">
        <OliveInput
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          autoComplete="name"
        />
      </OliveField>

      <div className="flex flex-col gap-1.5">
        <OliveField id={messageInputId} label="Message (optional)">
          <OliveTextarea
            value={message}
            maxLength={MAX_DONATION_MESSAGE_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Say a few words…"
          />
        </OliveField>
        <span className="olive-caption self-end">
          {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
        </span>
      </div>

      <OliveButton
        variant="primary"
        size="lg"
        type="submit"
        loading={isProcessing}
        disabled={!amountIsValid}
        className="self-start"
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </OliveButton>
    </form>
  );
}
