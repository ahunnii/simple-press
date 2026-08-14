import type { ReactElement } from "react";
import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";

import { sendResendEmail } from "./resend";

type SendEmailOptions = {
  to: string | string[];
  subject: string;
  react: ReactElement;
  replyTo?: string;
  from?: string;
  fromName?: string;
  tags?: Array<{ name: string; value: string }>;
  idempotencyKey?: string;
  /** Extra SMTP headers (e.g. RFC 8058 List-Unsubscribe / List-Unsubscribe-Post). */
  headers?: Record<string, string>;
};

// Email addresses
export const EMAIL_FROM = {
  NOREPLY: env.NEXT_PUBLIC_EMAIL_FROM_NOREPLY ?? "noreply@yourdomain.com",
  ORDERS: env.NEXT_PUBLIC_EMAIL_FROM_ORDERS ?? "orders@yourdomain.com",
  SUPPORT: env.NEXT_PUBLIC_EMAIL_FROM_SUPPORT ?? "support@yourdomain.com",
} as const;

/**
 * Derives the Sentry `email.type` discriminator from the Resend `category`
 * tag that (almost) every `send*Email` helper in `templates.ts` already
 * passes — it's what groups sends in the Resend dashboard. Reusing it here
 * means the Sentry tag can never drift out of sync with the Resend label,
 * and no helper needs a new parameter to opt in. If `"untagged"` ever shows
 * up in Sentry, some template helper forgot to pass a `category` tag.
 */
function emailTypeFrom(tags: Array<{ name: string; value: string }>): string {
  return tags.find((tag) => tag.name === "category")?.value ?? "untagged";
}

/**
 * Sends an email via Resend.
 *
 * Deliberately never throws. It always resolves to `{ success: true, id }`
 * or `{ success: false, error }`. Several callers (team invites, testimonial
 * invites, the back-in-stock cron job, and others) call this after already
 * committing a DB row or otherwise advancing state; if this threw, a
 * recoverable email failure would turn into a post-commit 500 — or, for the
 * Stripe webhook, an unwanted retry of work that already succeeded. Do not
 * change this contract. Callers that must react to a failure branch on the
 * returned `.success`.
 *
 * Because it never throws, the try/catch below is also the ONE place a
 * Resend failure is guaranteed to be observed. The ~24 call sites shaped
 * `try { await sendOrderConfirmation(...) } catch (e) { Sentry.captureException(e) }`
 * elsewhere in the codebase are dead for this purpose: since none of the
 * `send*Email` helpers ever throw, those catches can only fire if the React
 * email component itself throws during render — never a Resend outage, a
 * revoked API key, a 4xx, or a rate limit. So the capture lives here,
 * centrally, instead of relying on (or duplicating) those call-site catches.
 */
export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  from = EMAIL_FROM.NOREPLY,
  fromName,
  tags = [],
  idempotencyKey,
  headers,
}: SendEmailOptions) {
  // Hoisted above the try so the catch below can read them.
  const fromAddress = fromName
    ? `${fromName} via ${"SimplePress"} <${from}>`
    : from;
  const emailType = emailTypeFrom(tags);
  const businessTag = tags.find((tag) => tag.name === "business")?.value;

  try {
    const payload = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      replyTo,
      tags,
      ...(headers ? { headers } : {}),
    };

    const { data, error } = idempotencyKey
      ? await sendResendEmail(payload, { idempotencyKey })
      : await sendResendEmail(payload);

    if (error) {
      console.error("[Email] Send error:", error);
      // Preserve the structured Resend error (name, statusCode, ...) as
      // `cause` instead of flattening it into a string message.
      throw new Error(error.message, { cause: error });
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    // sendDefaultPii is off. Keep it that way here: no `subject` (visitor-
    // supplied free text can end up in it, e.g. the contact form's
    // name-derived default subject) and no recipient address. Only our own
    // `from` address, the category/business tags (already public in the
    // Resend dashboard), and a recipient count.
    Sentry.captureException(error, {
      tags: {
        service: "resend",
        "email.type": emailType,
        ...(businessTag ? { business: businessTag } : {}),
      },
      extra: {
        from: fromAddress,
        recipientCount: Array.isArray(to) ? to.length : 1,
        idempotent: Boolean(idempotencyKey),
      },
    });
    return { success: false, error };
  }
}
