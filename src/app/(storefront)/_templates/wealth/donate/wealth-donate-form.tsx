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

import { WealthInput } from "../shared/wealth-input";
import { WealthLedgeButton } from "../shared/wealth-ledge-button";

type CreateDonationSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Parses `POST /api/stripe/donations/create-session`'s response body. Same
 * guard as `PinkDonateForm`/`DefaultDonateForm` (that route is owned by a
 * different agent, so this is a small deliberate parallel rather than a
 * shared import — see the comment on those).
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
  /** Preset amounts in cents — already resolved to the owner's config or a wealth-specific fallback. */
  presetAmountsCents: number[];
  /** `id` of the page's form heading (rendered beside the form, not in it). */
  headingId?: string;
};

/**
 * Wealth's styled donation checkout form. Identical logic to
 * `PinkDonateForm`/`DefaultDonateForm` (preset/custom amount validation,
 * cents conversion, fetch shape, redirect-on-success / banner-on-failure) —
 * only the presentation is wealth's own (2026-10-12 redesign): a paper card
 * (it sits on the Give block's surface), square amount tiles (selected =
 * forest fill, white text), `.wealth-input` fields, and the `WealthLedgeButton`
 * "donate" variant as the submit CTA. The page renders the italic form
 * heading beside the card and passes its id as `headingId`.
 */
export function WealthDonateForm({
  label,
  presetAmountsCents,
  headingId,
}: Props) {
  const [selectedPreset, setSelectedPreset] = useState<number | null>(
    presetAmountsCents[0] ?? null,
  );
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountGroupId = useId();
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
      className="wealth-donate-card wealth-on-paper"
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : label.pageTitle}
    >
      {error && (
        <p role="alert" className="wealth-donate-error">
          {error}
        </p>
      )}

      <div>
        <p id={amountGroupId} className="wealth-eyebrow wealth-donate-label">
          Amount
        </p>
        <div
          role="group"
          aria-labelledby={amountGroupId}
          className="wealth-donate-amounts"
        >
          {presetAmountsCents.map((cents) => {
            const selected = selectedPreset === cents && !customAmount.trim();
            return (
              <button
                key={cents}
                type="button"
                onClick={() => choosePreset(cents)}
                aria-pressed={selected}
                className="wealth-donate-tile"
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>
        <div className="wealth-donate-custom">
          <label
            htmlFor={amountInputId}
            className="wealth-eyebrow wealth-donate-label"
          >
            Or enter a custom amount
          </label>
          <div className="wealth-donate-custom__field">
            <span className="wealth-donate-custom__prefix" aria-hidden="true">
              $
            </span>
            <WealthInput
              id={amountInputId}
              type="number"
              inputMode="decimal"
              min={MIN_DONATION_CENTS / 100}
              max={MAX_DONATION_CENTS / 100}
              step="0.01"
              value={customAmount}
              onChange={(e) => onCustomAmountChange(e.target.value)}
              placeholder={centsToDollarsString(presetAmountsCents[0] ?? null)}
            />
          </div>
        </div>
      </div>

      <div>
        <label
          htmlFor={nameInputId}
          className="wealth-eyebrow wealth-donate-label"
        >
          Your name (optional)
        </label>
        <WealthInput
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <div className="wealth-donate-label-row">
          <label htmlFor={messageInputId} className="wealth-eyebrow">
            Message (optional)
          </label>
          <span className="wealth-donate-count">
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
          className="wealth-input"
        />
      </div>

      <WealthLedgeButton
        type="submit"
        variant="donate"
        block
        disabled={isProcessing || !amountIsValid}
        className={cn(
          (isProcessing || !amountIsValid) && "cursor-not-allowed opacity-60",
        )}
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </WealthLedgeButton>
    </form>
  );
}
