"use client";

import type { CSSProperties, FormEvent } from "react";
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

import { VII_BUTTON_STYLE } from "../shared/vii-button-style";

type CreateDonationSessionResponse = {
  error?: string;
  sessionUrl?: string;
  sessionId?: string;
};

const NON_JSON_RESPONSE_MESSAGE =
  "We couldn't reach the payment service. Please try again in a moment.";

/**
 * Parses `POST /api/stripe/donations/create-session`'s response body. Same
 * guard as `DefaultDonateForm` (a small deliberate parallel rather than a
 * shared import — see the comment there; every styled donate form in the
 * repo carries this copy).
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

function presetStyle(selected: boolean): CSSProperties {
  return {
    minHeight: 44,
    minWidth: 88,
    padding: "10px 22px",
    borderRadius: "var(--radius)",
    border: `1px solid ${selected ? "var(--vii-navy)" : "var(--vii-hairline-strong)"}`,
    background: selected ? "var(--vii-navy)" : "transparent",
    color: selected ? "var(--vii-paper)" : "var(--vii-navy)",
    fontFamily: "var(--font-sans)",
    fontSize: 15,
    fontWeight: 500,
    letterSpacing: "0.02em",
    cursor: "pointer",
    transition:
      "background 0.25s var(--vii-ease), color 0.25s var(--vii-ease), border-color 0.25s var(--vii-ease)",
  };
}

type Props = {
  label: DonationLabel;
  /** Preset amounts in cents — already resolved to the owner's config or the lib defaults. */
  presetAmountsCents: number[];
};

/**
 * vii's donation checkout form. Identical logic to `DefaultDonateForm`
 * (preset/custom amount validation, cents conversion, fetch shape,
 * redirect-on-success / banner-on-failure) — only the presentation is vii's:
 * a paper card with a hairline, vii's underline inputs (the
 * `.vii-contact-form` rules in globals.css, shared with contact and
 * checkout), navy preset chips and the copper `vii-cta-btn` submit — never
 * Default's black buttons.
 *
 * Rendered outside any reveal wrapper on purpose: a form must never start
 * hidden.
 */
export function ViiDonateForm({ label, presetAmountsCents }: Props) {
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
  const messageCountId = useId();

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

  const submitDisabled = isProcessing || !amountIsValid;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      // `.vii-contact-form` gives the inputs vii's underline treatment.
      className="vii-contact-form"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 32,
        background: "var(--vii-paper)",
        border: "1px solid var(--vii-hairline)",
        borderRadius: "var(--radius)",
        padding: "clamp(24px, 4vw, 44px)",
      }}
    >
      {error && (
        <p
          role="alert"
          className="vii-fade-up"
          style={{
            margin: 0,
            padding: "12px 16px",
            background: "var(--vii-error-bg)",
            border: "1px solid var(--vii-error-border)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            lineHeight: 1.5,
            color: "var(--vii-error)",
          }}
        >
          {error}
        </p>
      )}

      <div>
        <span id={amountLabelId} className="vii-field-label">
          Amount
        </span>
        <div
          role="group"
          aria-labelledby={amountLabelId}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}
        >
          {presetAmountsCents.map((cents) => {
            const selected = selectedPreset === cents && !customAmount.trim();
            return (
              <button
                key={cents}
                type="button"
                onClick={() => choosePreset(cents)}
                aria-pressed={selected}
                style={presetStyle(selected)}
              >
                {formatPrice(cents)}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 24, maxWidth: 220 }}>
          <label htmlFor={amountInputId} className="vii-field-label">
            Or enter a custom amount
          </label>
          <div style={{ position: "relative" }}>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "var(--vii-ink-soft)",
                pointerEvents: "none",
              }}
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
              style={{ paddingLeft: 16 }}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={nameInputId} className="vii-field-label">
          Your name (optional)
        </label>
        <input
          id={nameInputId}
          type="text"
          autoComplete="name"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
        />
      </div>

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <label htmlFor={messageInputId} className="vii-field-label">
            Message (optional)
          </label>
          <span
            id={messageCountId}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--vii-ink-soft)",
            }}
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
          style={{ resize: "none" }}
        />
      </div>

      <button
        type="submit"
        disabled={submitDisabled}
        aria-busy={isProcessing}
        className="vii-cta-btn"
        style={{
          ...VII_BUTTON_STYLE,
          width: "100%",
          cursor: submitDisabled ? "not-allowed" : "pointer",
          opacity: submitDisabled ? 0.6 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        {isProcessing && (
          <Loader2
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
        {isProcessing ? "Redirecting…" : label.buttonText}
      </button>
    </form>
  );
}
