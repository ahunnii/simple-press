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
 * PinkArt's styled donation checkout form. Identical logic to
 * `DefaultDonateForm` (preset/custom amount validation, cents conversion,
 * fetch shape, redirect-on-success / banner-on-failure) — only the
 * presentation is pink's own: `.pink-btn`/`.pink-input`/`.pink-label` and
 * `--pink-*` tokens instead of the default's neutral `#e8e8e8` palette.
 */
export function PinkDonateForm({ label, presetAmountsCents }: Props) {
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
      className="flex flex-col gap-6 p-6 sm:p-8"
      style={{ background: "var(--pink-white)", border: "1px solid var(--pink-line)" }}
    >
      {error && (
        <p
          role="alert"
          className="p-4 text-[14px]"
          style={{
            background: "var(--pink-error-bg)",
            border: "1px solid var(--pink-error-border)",
            color: "var(--pink-error)",
          }}
        >
          {error}
        </p>
      )}

      <div>
        <span className="pink-label">Amount</span>
        <div className="mt-3 flex flex-wrap gap-2">
          {presetAmountsCents.map((cents) => {
            const selected = selectedPreset === cents && !customAmount.trim();
            return (
              <button
                key={cents}
                type="button"
                onClick={() => choosePreset(cents)}
                aria-pressed={selected}
                className={cn(
                  "pink-btn pink-btn-sm",
                  selected ? "pink-btn-solid" : "pink-btn-ghost",
                )}
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>
        <div className="mt-4">
          <label
            htmlFor={amountInputId}
            className="pink-label mb-1.5 block"
          >
            Or enter a custom amount
          </label>
          <div className="relative max-w-[180px]">
            <span
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px]"
              style={{ color: "var(--pink-subtle)" }}
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
              className="pink-input"
              style={{ paddingLeft: "28px" }}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={nameInputId} className="pink-label mb-1.5 block">
          Your name (optional)
        </label>
        <input
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
          className="pink-input"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={messageInputId} className="pink-label">
            Message (optional)
          </label>
          <span className="text-[12px]" style={{ color: "var(--pink-subtle)" }}>
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
          className="pink-input mt-1.5 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isProcessing || !amountIsValid}
        className="pink-btn pink-btn-solid pink-btn-lg"
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </button>
    </form>
  );
}
