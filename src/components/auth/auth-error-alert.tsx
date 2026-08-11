"use client";

import type { AuthErrorInfo } from "~/lib/auth/auth-error-messages";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

/**
 * Form-level auth failure notice.
 *
 * SIMPLEPRESS LOCAL FILE — hand-authored, not part of the Better Auth UI
 * registry. Safe to keep across a re-fetch of `src/components/auth/**`.
 *
 * Sits directly above the submit button inside `CardContent`, so it is styled
 * to read as one more row of the form rather than a banner bolted onto it.
 *
 * Captcha failures render here too. They used to be suppressed and shown as a
 * `FieldError` beside the widget, so the user's eye landed on the control they
 * had to fix — but reCAPTCHA v3 is invisible, so there is no longer a control
 * to point at. A form-level alert is now the only place the message can go;
 * suppressing it here would drop it silently.
 */
export function AuthErrorAlert({
  error,
  className,
}: {
  error?: AuthErrorInfo | null;
  className?: string;
}) {
  if (!error) return null;

  return (
    <Alert
      variant="destructive"
      // `Alert` already sets role="alert"; repeated here so the announcement
      // does not silently depend on a shared primitive we do not own.
      role="alert"
      className={cn("border-destructive/40", className)}
    >
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
