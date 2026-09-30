"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { Loader2 } from "lucide-react";

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
 * NoiseDonateForm — Default's donation checkout form in noise's contact-form
 * face: preset amounts as `vn-stamp` toggles (`aria-pressed`, the selected
 * one filled ink), underline inputs and mono field labels from
 * `.vn-contact-form`, and the contact form's ink submit bar.
 *
 * Behaviour is Default's, unchanged: pick a preset or type an amount, post
 * to `/api/stripe/donations/create-session`, redirect to the returned Stripe
 * Checkout URL; failures show inline in a live alert. (Olive and pollen carry
 * the same logic in their own restyled copies — Default's component bakes in
 * its own colours and takes no styling props.)
 *
 * Never wrapped in a scroll reveal — a form must not start at opacity 0.
 */
export function NoiseDonateForm({ label, presetAmountsCents }: Props) {
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
  const messageCountId = useId();

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
      className="vn-contact-form flex flex-col gap-8 border border-(--vn-rule) bg-(--vn-paper) p-6 sm:p-10"
    >
      {error ? (
        <p
          role="alert"
          className="border-destructive text-destructive border px-4 py-3 font-mono text-[10px] leading-relaxed tracking-[0.14em] uppercase"
        >
          {error}
        </p>
      ) : null}

      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="vn-field-label p-0">Amount</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {presetAmountsCents.map((cents) => {
            const pressed = selectedPreset === cents && !customAmount.trim();
            return (
              <button
                key={cents}
                type="button"
                onClick={() => choosePreset(cents)}
                aria-pressed={pressed}
                className={cn(
                  "vn-stamp cursor-pointer transition-colors",
                  pressed
                    ? "vn-stamp-solid"
                    : "text-(--vn-ink) hover:bg-(--vn-line-soft)",
                )}
                // `.vn-stamp` sets its own (small) padding and font size;
                // an amount toggle needs a real tap target.
                style={{ padding: "10px 16px", fontSize: "11px" }}
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>

        <div className="mt-6 max-w-[14rem]">
          <label htmlFor={amountInputId} className="vn-field-label">
            Or enter a custom amount
          </label>
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 font-sans text-[14px] text-(--vn-steel-mist)"
            >
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
              style={{ paddingLeft: "1rem" }}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label htmlFor={nameInputId} className="vn-field-label">
          Your name (optional)
        </label>
        <input
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          autoComplete="name"
          placeholder="First & last"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={messageInputId} className="vn-field-label">
            Message (optional)
          </label>
          <span
            id={messageCountId}
            className="font-mono text-[9.5px] tracking-[0.14em] text-(--vn-steel-mist)"
          >
            {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
          </span>
        </div>
        <textarea
          id={messageInputId}
          value={message}
          maxLength={MAX_DONATION_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          aria-describedby={messageCountId}
          placeholder="Say a few words…"
          className="resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing || !amountIsValid}
        className="flex w-full items-center justify-between gap-10 bg-(--vn-ink) px-5 py-4 font-mono text-[11px] tracking-[0.24em] text-(--vn-bone) uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:min-w-[240px] sm:self-start"
      >
        <span className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : null}
          {isProcessing ? "Redirecting…" : label.buttonText}
        </span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
