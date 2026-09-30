"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

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
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";

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
 * shared import — see the comment there).
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

/** Compact gold eyebrow tier (docs/templates/bamboo/design.md rulebook). */
const EYEBROW =
  "text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase";

const LABEL = "text-foreground block text-sm font-medium";

/** Shadcn `Input` restyled only in shape — colors come from the `.bamboo` remap. */
const FIELD = "bg-background h-11 rounded-xl px-4";

type Props = {
  label: DonationLabel;
  /** Preset amounts in cents — already resolved to the owner's config or the lib defaults. */
  presetAmountsCents: number[];
};

/**
 * Bamboo's donation checkout form. Logic is `DefaultDonateForm`'s verbatim
 * (preset/custom amount validation, cents conversion, the create-session
 * fetch, redirect-on-success / banner-on-failure); only the presentation is
 * bamboo's: a hairline cream card, rounded-full amount chips (forest when
 * selected), the shadcn inputs bamboo's token remap already restyles, and
 * the forest CTA pill.
 *
 * Rendered outside any FadeIn/reveal wrapper on purpose: a form must never
 * start hidden.
 */
export function BambooDonateForm({ label, presetAmountsCents }: Props) {
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
  const amountLabelId = useId();

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
      className="bg-card flex flex-col gap-7 rounded-2xl border border-[var(--bam-hairline)] p-6 shadow-sm sm:p-10"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <span id={amountLabelId} className={EYEBROW}>
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
                  "focus-visible:ring-ring min-h-11 rounded-full border px-6 py-2.5 text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  selected
                    ? "border-[var(--bam-forest)] bg-[var(--bam-forest)] text-[var(--bam-cream)]"
                    : "text-foreground bg-card border-[var(--bam-hairline)] hover:border-[var(--bam-forest)] hover:bg-[var(--bam-cream-deep)]",
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
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
              $
            </span>
            <Input
              id={amountInputId}
              type="number"
              inputMode="decimal"
              min={MIN_DONATION_CENTS / 100}
              max={MAX_DONATION_CENTS / 100}
              step="0.01"
              value={customAmount}
              onChange={(e) => onCustomAmountChange(e.target.value)}
              placeholder={centsToDollarsString(presetAmountsCents[0] ?? null)}
              className={cn(FIELD, "pl-7")}
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor={nameInputId} className={LABEL}>
          Your name (optional)
        </label>
        <Input
          id={nameInputId}
          type="text"
          value={donorName}
          maxLength={MAX_DONOR_NAME_LENGTH}
          onChange={(e) => setDonorName(e.target.value)}
          placeholder="Jane Doe"
          className={cn(FIELD, "mt-1.5")}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={messageInputId} className={LABEL}>
            Message (optional)
          </label>
          <span
            className="text-muted-foreground text-xs tabular-nums"
            aria-hidden="true"
          >
            {message.length}/{MAX_DONATION_MESSAGE_LENGTH}
          </span>
        </div>
        <Textarea
          id={messageInputId}
          value={message}
          maxLength={MAX_DONATION_MESSAGE_LENGTH}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Say a few words…"
          className="bg-background mt-1.5 min-h-24 resize-none rounded-xl px-4 py-3"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isProcessing || !amountIsValid}
        className="group h-12 rounded-full bg-[var(--bam-forest)] text-base text-[var(--bam-cream)] hover:bg-[var(--bam-forest-deep)]"
      >
        {isProcessing ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Redirecting…
          </>
        ) : (
          <>
            {label.buttonText}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </>
        )}
      </Button>
    </form>
  );
}
