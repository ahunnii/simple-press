import "server-only";

import * as Sentry from "@sentry/nextjs";

import type { ResendBatchEmail } from "~/lib/email/resend";
import type { MaterialPolicyUpdate } from "~/lib/legal/material-updates";
import type { DbClient } from "~/server/db";
import { env } from "~/env";
import { isRetryableResendError, sendResendBatch } from "~/lib/email/resend";
import { EMAIL_FROM } from "~/lib/email/send";
import { renderPolicyUpdateNoticeEmail } from "~/lib/email/templates";

/**
 * Sending the "Updates to SimplePress policies" notice to store owners.
 *
 * Recipients: every distinct user holding an OWNER membership on a business
 * that is not `closed` (suspended stores still count — their owner is still
 * bound by the terms and may want to act on them). Deduplicated by lower-cased
 * email, so someone who owns three stores gets one email. Managers and staff
 * are not notified: the agreements are the owner's.
 *
 * This is a LEGAL notice, not marketing: it ignores marketing opt-outs and the
 * do-not-email list on purpose and carries no unsubscribe link.
 */

/** Resend's batch endpoint accepts up to 100 emails per request. */
const BATCH_SIZE = 100;
/** Resend allows 10 req/s per team, shared with marketing campaigns. */
const BATCH_GAP_MS = 700;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

export async function listPolicyNoticeRecipients(
  db: DbClient,
): Promise<string[]> {
  const owners = await db.user.findMany({
    where: {
      memberships: {
        some: { role: "OWNER", business: { status: { not: "closed" } } },
      },
    },
    select: { email: true },
  });
  const byLower = new Map<string, string>();
  for (const { email } of owners) {
    const trimmed = email.trim();
    if (trimmed) byLower.set(trimmed.toLowerCase(), trimmed);
  }
  // Sorted so a retry builds byte-identical batches — Resend rejects a reused
  // idempotency key whose payload changed.
  return [...byLower.values()].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
}

export type PolicyNoticeSendResult = {
  /** Emails Resend accepted (or, on the preview env, would have). */
  accepted: number;
  /** Addresses Resend rejected individually (bad address, etc.). */
  rejected: number;
  /** A batch that failed outright: how many recipients were NOT handed over. */
  failedRecipients: number;
  firstError: string | null;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Hand the notice to Resend in batches of up to 100. Never throws; failures
 * come back in the result so the caller can decide whether to record the
 * send. Each batch carries a deterministic idempotency key, so re-running the
 * same send within Resend's 24h window cannot double-deliver a batch that was
 * already accepted.
 */
export async function sendPolicyUpdateNoticeBatches(input: {
  update: MaterialPolicyUpdate;
  recipients: readonly string[];
}): Promise<PolicyNoticeSendResult> {
  const { subject, html, text } = await renderPolicyUpdateNoticeEmail({
    update: input.update,
    platformDomain: env.NEXT_PUBLIC_PLATFORM_DOMAIN,
  });

  const result: PolicyNoticeSendResult = {
    accepted: 0,
    rejected: 0,
    failedRecipients: 0,
    firstError: null,
  };

  for (let start = 0; start < input.recipients.length; start += BATCH_SIZE) {
    const chunk = input.recipients.slice(start, start + BATCH_SIZE);
    const emails: ResendBatchEmail[] = chunk.map((to) => ({
      from: EMAIL_FROM.NOREPLY,
      to,
      subject,
      html,
      text,
      tags: [{ name: "category", value: "policy_update_notice" }],
    }));
    const idempotencyKey = `policy-notice:${input.update.id}:${start / BATCH_SIZE}`;

    if (start > 0) await sleep(BATCH_GAP_MS);

    let response = await sendResendBatch(emails, {
      idempotencyKey,
      timeoutMs: 30_000,
    });
    for (const delay of RETRY_DELAYS_MS) {
      if (!response.error || !isRetryableResendError(response.error)) break;
      await sleep(delay);
      response = await sendResendBatch(emails, {
        idempotencyKey,
        timeoutMs: 30_000,
      });
    }

    if (response.error) {
      result.failedRecipients += chunk.length;
      result.firstError ??= response.error.message;
      Sentry.captureException(new Error(response.error.message), {
        tags: { service: "resend", "email.type": "policy_update_notice" },
        extra: { updateId: input.update.id, batch: start / BATCH_SIZE },
      });
      continue;
    }

    result.rejected += response.errors.length;
    result.accepted += chunk.length - response.errors.length;
    if (response.errors.length > 0) {
      // No addresses in Sentry (sendDefaultPii is off) — counts only.
      Sentry.captureMessage("Policy update notice: addresses rejected", {
        level: "warning",
        tags: { service: "resend", "email.type": "policy_update_notice" },
        extra: {
          updateId: input.update.id,
          batch: start / BATCH_SIZE,
          rejected: response.errors.length,
        },
      });
    }
  }

  return result;
}
