// app/api/webhooks/resend/route.ts
//
// Resend delivery events for marketing campaigns (bounces, complaints,
// deliveries). Register this endpoint in the Resend dashboard for: email.sent,
// email.delivered, email.delivery_delayed, email.bounced, email.complained,
// email.failed and email.suppressed, and put its signing secret in
// RESEND_WEBHOOK_SECRET.
//
// Resend signs with Svix. Verification uses the SDK's built-in
// `resend.webhooks.verify` (svix under the hood: HMAC over
// `${svix-id}.${svix-timestamp}.${body}`, 5-minute timestamp tolerance), which
// is a pure local check — it makes no API call.
//
// Responses: 401 when the secret is not configured, 400 on a bad signature,
// 500 on an unexpected processing error (Resend then retries; every update in
// `applyResendEvent` is conditional and idempotent), otherwise 200 — including
// for events we deliberately ignore (transactional mail, unknown email ids).
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import type { ResendWebhookEvent } from "~/lib/marketing/resend-events";
import { env } from "~/env";
import { resend } from "~/lib/email/resend";
import { applyResendEvent } from "~/lib/marketing/resend-events";
import { db } from "~/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Once per server process: an unset secret means every bounce / complaint is
// dropped (Resend just sees 401s), so make it loud without spamming Sentry on
// every delivery attempt.
let missingSecretWarned = false;

function warnMissingSecret(): void {
  if (missingSecretWarned) return;
  missingSecretWarned = true;
  const message =
    "RESEND_WEBHOOK_SECRET is not set — /api/webhooks/resend is rejecting all " +
    "events, so marketing bounces and complaints are not being recorded and " +
    "bad addresses are not suppressed. Set RESEND_WEBHOOK_SECRET to the " +
    "webhook's signing secret from the Resend dashboard.";
  console.warn(message);
  Sentry.captureMessage(message, {
    level: "warning",
    tags: { "webhook.provider": "resend", "webhook.step": "auth-config" },
  });
}

export async function POST(req: Request) {
  const webhookSecret = env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    warnMissingSecret();
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 401 },
    );
  }

  const payload = await req.text();

  let event: ResendWebhookEvent;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await applyResendEvent(db, event);
  } catch (err: unknown) {
    Sentry.captureException(err, {
      tags: { "webhook.provider": "resend", "webhook.step": "apply-event" },
      extra: { eventType: event.type, emailId: event.data?.email_id },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
