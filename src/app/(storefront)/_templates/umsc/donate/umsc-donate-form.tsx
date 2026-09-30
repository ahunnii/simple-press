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

import { UmscButton } from "../shared/umsc-button";
import {
  UmscInput,
  UmscLabel,
  UmscTextarea,
  UmscTogglePills,
} from "../shared/umsc-form-fields";

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
 * UmscDonateForm — Default's donation checkout form in umsc's contact-form
 * face: preset amounts as the shared `UmscTogglePills` (`aria-pressed`, the
 * selected one black with gold-soft text), `UmscInput`/`UmscTextarea`
 * fields with muted labels, and a gold pill submit.
 *
 * Behaviour is Default's, byte-for-byte: pick a preset or type an amount,
 * post to `/api/stripe/donations/create-session`, redirect to the returned
 * Stripe Checkout URL; failures show inline in a live alert. The platform
 * has no shared donation hook — every template (noise, olive, pollen, vii,
 * dream, …) carries this same logic in a restyled copy because Default's
 * component bakes in its own colours and takes no styling props. Any change
 * to the request shape must land in Default's form and every copy.
 *
 * Never wrapped in a scroll reveal — a form must not start at opacity 0.
 */
export function UmscDonateForm({ label, presetAmountsCents }: Props) {
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

  // The pill group's pressed value: none while a custom amount is typed.
  const pressedValue =
    selectedPreset !== null && !customAmount.trim()
      ? String(selectedPreset)
      : "";

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
      className="umsc-donate-form flex flex-col gap-7 border border-[var(--umsc-line)] bg-[var(--umsc-white)] p-6 sm:p-9"
    >
      {error ? (
        <p
          role="alert"
          className="umsc-sans border-l-2 border-[var(--umsc-error)] bg-[var(--umsc-paper)] px-4 py-3 text-[14px] leading-[1.5] text-[var(--umsc-error)]"
        >
          {error}
        </p>
      ) : null}

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="umsc-sans mb-3 p-0 text-[13px] font-medium text-[var(--umsc-muted)]">
          Amount
        </legend>
        <UmscTogglePills
          aria-label="Preset amounts"
          value={pressedValue}
          onChange={(value) => choosePreset(Number(value))}
          options={presetAmountsCents.map((cents) => ({
            value: String(cents),
            label: <span className="umsc-tabular">{formatPrice(cents)}</span>,
          }))}
        />
        <div className="max-w-[220px]">
          <UmscLabel htmlFor={amountInputId}>
            Or enter a custom amount
          </UmscLabel>
          <div className="relative">
            <span
              aria-hidden="true"
              className="umsc-sans pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-[var(--umsc-muted)]"
            >
              $
            </span>
            <UmscInput
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
      </fieldset>

      <div>
        <UmscLabel htmlFor={nameInputId}>Your name (optional)</UmscLabel>
        <UmscInput
          id={nameInputId}
          type="text"
          autoComplete="name"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <UmscLabel htmlFor={messageInputId}>Message (optional)</UmscLabel>
          <span
            id={messageCountId}
            className="umsc-sans umsc-tabular text-[12px] text-[var(--umsc-muted)]"
          >
            {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
          </span>
        </div>
        <UmscTextarea
          id={messageInputId}
          value={message}
          maxLength={MAX_DONATION_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          aria-describedby={messageCountId}
        />
      </div>

      <UmscButton
        as="button"
        type="submit"
        variant="gold"
        disabled={isProcessing || !amountIsValid}
        className="self-start disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? "Redirecting…" : label.buttonText}
      </UmscButton>
    </form>
  );
}
