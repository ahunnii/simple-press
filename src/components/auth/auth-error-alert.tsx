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
 * Renders nothing for a captcha failure: that message belongs beside the
 * captcha widget (as a `FieldError`), not at the bottom of the form, so the
 * user's eye lands on the control they have to fix.
 */
export function AuthErrorAlert({
  error,
  className,
}: {
  error?: AuthErrorInfo | null;
  className?: string;
}) {
  if (!error || error.field === "captcha") return null;

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
