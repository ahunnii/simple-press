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

import { DreamButton } from "../shared/dream-button";
import {
  DreamInput,
  DreamRadioPills,
  DreamTextarea,
} from "../shared/dream-input";

type CreateDonationSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Parses `POST /api/stripe/donations/create-session`'s response body. Same
 * guard as `DefaultDonateForm` (that route is owned elsewhere, so this is a
 * small deliberate parallel rather than a shared import — see the comment
 * there).
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
 * dream's donation checkout form. Identical logic to `DefaultDonateForm`
 * (preset/custom amount validation, cents conversion, fetch shape,
 * redirect-on-success / banner-on-failure) — only the presentation is
 * dream's: a paper `dream-card`, the preset amounts as `DreamRadioPills`
 * (a real radio group — arrow keys move between amounts), `DreamInput` /
 * `DreamTextarea` fields with the quote form's label style, and a primary
 * `DreamButton` submit.
 *
 * Rendered outside any reveal wrapper on purpose: a form must never start
 * hidden.
 */
export function DreamDonateForm({ label, presetAmountsCents }: Props) {
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
  const presetsName = useId();

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

  // A typed custom amount deselects every preset pill.
  const presetValue =
    selectedPreset !== null && !customAmount.trim()
      ? String(selectedPreset)
      : "";

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="dream-card flex flex-col gap-7"
    >
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--dream-radius-input)] border border-[var(--dream-error)] px-4 py-3 text-sm text-[var(--dream-error)]"
        >
          {error}
        </p>
      ) : null}

      {presetAmountsCents.length > 0 ? (
        <DreamRadioPills
          name={presetsName}
          legend="Amount"
          options={presetAmountsCents.map((cents) => ({
            value: String(cents),
            label: formatPrice(cents),
          }))}
          value={presetValue}
          onChange={(value) => choosePreset(Number(value))}
        />
      ) : null}

      <label htmlFor={amountInputId} className="flex flex-col gap-2 text-sm">
        <span>
          {presetAmountsCents.length > 0
            ? "Or enter a custom amount"
            : "Amount"}
        </span>
        <span className="relative block max-w-[200px]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[16px] text-[var(--dream-soft)]"
          >
            $
          </span>
          <DreamInput
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
        </span>
      </label>

      <label htmlFor={nameInputId} className="flex flex-col gap-2 text-sm">
        <span>
          Your name <span className="text-[var(--dream-soft)]">(optional)</span>
        </span>
        <DreamInput
          id={nameInputId}
          type="text"
          autoComplete="name"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
        />
      </label>

      <label htmlFor={messageInputId} className="flex flex-col gap-2 text-sm">
        <span className="flex items-baseline justify-between gap-3">
          <span>
            Message <span className="text-[var(--dream-soft)]">(optional)</span>
          </span>
          <span className="text-xs text-[var(--dream-soft)]" aria-hidden="true">
            {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
          </span>
        </span>
        <DreamTextarea
          id={messageInputId}
          value={message}
          maxLength={MAX_DONATION_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Say a few words…"
        />
      </label>

      <div>
        <DreamButton
          type="submit"
          variant="primary"
          disabled={isProcessing || !amountIsValid}
          className="w-full sm:w-auto"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : null}
          {isProcessing ? "Redirecting…" : label.buttonText}
        </DreamButton>
      </div>
    </form>
  );
}
