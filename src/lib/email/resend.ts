import { Resend } from "resend";

import { env } from "~/env";

if (!env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set");
}

export const resend = new Resend(env.RESEND_API_KEY);

type ResendSendPayload = Parameters<typeof resend.emails.send>[0];
type ResendSendOptions = Parameters<typeof resend.emails.send>[1];

/**
 * Guarded wrapper around `resend.emails.send`.
 *
 * On the preview/staging deployment (`IS_PREVIEW_ENV=true`) outbound email is
 * neutralized so the preview env — which runs on a clone of production data —
 * can never email real customers:
 *   - if `EMAIL_REDIRECT_TO` is set, all mail is rerouted to that single inbox;
 *   - otherwise the send is skipped entirely.
 *
 * All send paths (templated emails via `send.ts` and the better-auth
 * verification/reset senders) must go through this helper.
 */
export async function sendResendEmail(
  payload: ResendSendPayload,
  options?: ResendSendOptions,
) {
  if (env.IS_PREVIEW_ENV) {
    if (env.EMAIL_REDIRECT_TO) {
      payload = { ...payload, to: env.EMAIL_REDIRECT_TO };
    } else {
      console.log(
        "[Email] Suppressed on preview env (IS_PREVIEW_ENV=true):",
        payload.subject,
      );
      return { data: null, error: null };
    }
  }

  return options
    ? resend.emails.send(payload, options)
    : resend.emails.send(payload);
}
