import type { ReactElement } from "react";

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
};

// Email addresses
export const EMAIL_FROM = {
  NOREPLY: env.NEXT_PUBLIC_EMAIL_FROM_NOREPLY ?? "noreply@yourdomain.com",
  ORDERS: env.NEXT_PUBLIC_EMAIL_FROM_ORDERS ?? "orders@yourdomain.com",
  SUPPORT: env.NEXT_PUBLIC_EMAIL_FROM_SUPPORT ?? "support@yourdomain.com",
} as const;

export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
  from = EMAIL_FROM.NOREPLY,
  fromName,
  tags = [],
  idempotencyKey,
}: SendEmailOptions) {
  try {
    const fromAddress = fromName
      ? `${fromName} via ${"SimplePress"} <${from}>`
      : from;

    const payload = {
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      react,
      replyTo,
      tags,
    };

    const { data, error } = idempotencyKey
      ? await sendResendEmail(payload, { idempotencyKey })
      : await sendResendEmail(payload);

    if (error) {
      console.error("[Email] Send error:", error);
      throw new Error(error.message);
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return { success: false, error };
  }
}
