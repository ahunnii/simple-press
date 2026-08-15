import { TRPCError } from "@trpc/server";

import type { RecaptchaFailureReason } from "~/lib/captcha/verify-recaptcha";

/**
 * Map a failed `verifyRecaptcha` result to a tRPC error.
 * Provider outages become INTERNAL_SERVER_ERROR (5xx) so they are not
 * confused with ordinary bot/token rejections (BAD_REQUEST).
 */
export function captchaFailureToTrpcError(
  reason: RecaptchaFailureReason,
): TRPCError {
  const isProvider = reason === "provider-error";
  return new TRPCError({
    code: isProvider ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
    message: isProvider
      ? "Verification temporarily unavailable. Please try again shortly."
      : "Captcha verification failed",
    cause: new Error(`recaptcha verification failed: ${reason}`),
  });
}
