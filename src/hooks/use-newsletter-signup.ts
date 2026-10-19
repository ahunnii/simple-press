"use client";

import { useCallback, useRef, useState } from "react";

import { useRecaptchaV3 } from "~/lib/captcha/use-recaptcha-v3";
import { api } from "~/trpc/react";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

/** reCAPTCHA v3 action asserted server-side by `newsletter.subscribe`. */
const RECAPTCHA_ACTION = "newsletter";

export type NewsletterSignupStatus =
  | "idle"
  | "submitting"
  | "success"
  | "error"
  /** Email marketing is off for this store: render the honest fallback. */
  | "disabled";

type SubmitInput = { email: string; firstName?: string; lastName?: string };

/**
 * Shared state for every template's newsletter form.
 *
 * Double opt-in: `success` means "we sent a confirmation email" (the server
 * answers identically whether or not the address was already subscribed), so
 * forms should say "Check your inbox to confirm", not "You're subscribed".
 *
 * Render `<NewsletterHoneypot inputRef={honeypotRef} />` inside the form; its
 * value rides along on submit. When `enabled` is false (flag off) show the
 * template's existing fallback and don't offer a form that can't work.
 */
export function useNewsletterSignup({
  warm = "mount",
}: {
  /**
   * When to load Google's reCAPTCHA script. Default `"mount"`. A sign-up that
   * renders on every page (a footer) should pass `"interaction"` and call
   * `warmCaptcha()` on first focus so the script isn't loaded for visitors who
   * never touch the form.
   */
  warm?: "mount" | "interaction";
} = {}) {
  const enabled = useStorefrontFlags().isEnabled("emailMarketing");
  const { execute: executeRecaptcha, warm: warmCaptcha } = useRecaptchaV3({
    enabled,
    warm,
  });
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<NewsletterSignupStatus>(
    enabled ? "idle" : "disabled",
  );
  const [error, setError] = useState<string | null>(null);

  const { mutate } = api.newsletter.subscribe.useMutation({
    onSuccess: () => {
      setError(null);
      setStatus("success");
    },
    onError: (err) => {
      if (err.data?.code === "FORBIDDEN") {
        setStatus("disabled");
        return;
      }
      setError(
        err.data?.code === "TOO_MANY_REQUESTS"
          ? "Too many attempts. Please try again in a little while."
          : "Something went wrong. Please try again.",
      );
      setStatus("error");
    },
  });

  const submit = useCallback(
    async ({ email, firstName, lastName }: SubmitInput) => {
      if (!enabled) return;
      setError(null);
      setStatus("submitting");
      // Fresh token per attempt: v3 tokens are single-use and expire in 120s.
      const captchaToken = await executeRecaptcha(RECAPTCHA_ACTION);
      mutate({
        email,
        firstName: firstName?.trim() ? firstName.trim() : undefined,
        lastName: lastName?.trim() ? lastName.trim() : undefined,
        captchaToken: captchaToken ?? "",
        website: honeypotRef.current?.value ?? "",
      });
    },
    [enabled, executeRecaptcha, mutate],
  );

  const reset = useCallback(() => {
    setError(null);
    setStatus(enabled ? "idle" : "disabled");
  }, [enabled]);

  return {
    enabled,
    status: enabled ? status : ("disabled" as const),
    isSubmitting: status === "submitting",
    isSuccess: status === "success",
    error,
    honeypotRef,
    warmCaptcha,
    submit,
    reset,
  };
}
