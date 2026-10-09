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

import { gloveButtonClass, GloveInput, GloveTextarea } from "../shared";

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

type Props = {
  label: DonationLabel;
  /** Preset amounts in cents — already resolved to the owner's config or the lib defaults. */
  presetAmountsCents: number[];
};

/**
 * Glove's styled donation checkout form. Identical logic to
 * `DefaultDonateForm` (preset/custom amount validation, cents conversion,
 * fetch shape, redirect-on-success / banner-on-failure) — only the
 * presentation is glove's own: a hairline white card, `glove-input` fields,
 * purple preset chips and a purple submit button.
 *
 * Rendered outside any FadeIn/reveal wrapper on purpose: a form must never
 * start hidden.
 */
export function GloveDonateForm({ label, presetAmountsCents }: Props) {
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
      className="flex flex-col gap-7 rounded-[12px] border border-[var(--glove-line)] bg-[var(--glove-paper)] p-6 [box-shadow:var(--glove-shadow-sm)] sm:p-10"
    >
      {error ? (
        <p
          role="alert"
          className="glove-error glove-body rounded-[8px] border border-[var(--glove-alert)] px-4 py-3 text-[14px]"
        >
          {error}
        </p>
      ) : null}

      <div>
        <span
          id={amountLabelId}
          className="glove-display text-[13px] font-medium tracking-[2px] text-[var(--glove-primary)] uppercase"
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
                className={gloveButtonClass({
                  variant: selected ? "solid" : "outlinePrimary",
                  size: "md",
                })}
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>
        <div className="mt-5">
          <label
            htmlFor={amountInputId}
            className="glove-body block text-[14px] font-bold text-[var(--glove-ink)]"
          >
            Or enter a custom amount
          </label>
          <div className="relative mt-1.5 max-w-[180px]">
            <span
              className="glove-body pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-[var(--glove-muted)]"
              aria-hidden="true"
            >
              $
            </span>
            <GloveInput
              id={amountInputId}
              type="number"
              inputMode="decimal"
              min={MIN_DONATION_CENTS / 100}
              max={MAX_DONATION_CENTS / 100}
              step="0.01"
              value={customAmount}
              onChange={(e) => onCustomAmountChange(e.target.value)}
              placeholder={centsToDollarsString(presetAmountsCents[0] ?? null)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={nameInputId}
          className="glove-body block text-[14px] font-bold text-[var(--glove-ink)]"
        >
          Your name (optional)
        </label>
        <GloveInput
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
          className="mt-1.5"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label
            htmlFor={messageInputId}
            className="glove-body block text-[14px] font-bold text-[var(--glove-ink)]"
          >
            Message (optional)
          </label>
          <span
            className="glove-body text-[12px] text-[var(--glove-muted)]"
            aria-hidden="true"
          >
            {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
          </span>
        </div>
        <GloveTextarea
          id={messageInputId}
          value={message}
          maxLength={MAX_DONATION_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Say a few words…"
          className="mt-1.5"
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing || !amountIsValid}
        className={gloveButtonClass({
          variant: "woo",
          size: "lg",
          fullWidth: true,
        })}
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </button>
    </form>
  );
}
