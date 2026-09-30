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
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
 * guard as `DefaultDonateForm` / `PollenDonateForm` (a small deliberate
 * parallel rather than a shared import — see the comment in Default's form).
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
 * Happy-bamboo's styled donation checkout form. Identical logic to
 * `DefaultDonateForm` (preset/custom amount validation, cents conversion,
 * fetch shape, redirect-on-success / alert-on-failure) — only the
 * presentation is happy-bamboo's: a `Card` shell, shadcn `Input`/`Textarea`/
 * `Label`, token buttons, the contact form's destructive `Alert`.
 *
 * Rendered outside any FadeIn/reveal wrapper on purpose: a form must never
 * start hidden.
 */
export function HappyBambooDonateForm({ label, presetAmountsCents }: Props) {
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
    <Card className="py-0">
      <CardContent className="p-6 sm:p-8">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-6"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <span
              id={amountLabelId}
              className="text-primary text-sm font-semibold tracking-wider uppercase"
            >
              Amount
            </span>
            <div
              className="mt-3 flex flex-wrap gap-2"
              role="group"
              aria-labelledby={amountLabelId}
            >
              {presetAmountsCents.map((cents) => {
                const selected =
                  selectedPreset === cents && !customAmount.trim();
                return (
                  <Button
                    key={cents}
                    type="button"
                    variant={selected ? "default" : "outline"}
                    onClick={() => choosePreset(cents)}
                    aria-pressed={selected}
                    className="min-h-11 min-w-20 px-5 text-base font-semibold"
                  >
                    {formatPrice(cents)}
                  </Button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-col gap-1.5">
              <Label htmlFor={amountInputId}>Or enter a custom amount</Label>
              <div className="relative max-w-[180px]">
                <span
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
                  aria-hidden="true"
                >
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
                  placeholder={centsToDollarsString(
                    presetAmountsCents[0] ?? null,
                  )}
                  className="h-11 pl-7"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={nameInputId}>Your name (optional)</Label>
            <Input
              id={nameInputId}
              type="text"
              value={donorName}
              maxLength={MAX_DONOR_NAME_LENGTH}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Jane Doe"
              autoComplete="name"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor={messageInputId}>Message (optional)</Label>
              <span
                className="text-muted-foreground text-xs"
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
              className="resize-none"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isProcessing || !amountIsValid}
            className="w-full sm:w-auto sm:self-start"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Redirecting…
              </>
            ) : (
              label.buttonText
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
