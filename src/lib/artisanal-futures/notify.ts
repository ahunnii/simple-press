import "server-only";

import * as Sentry from "@sentry/nextjs";

import { env } from "~/env";
import { signPartnerRequest } from "~/lib/partner-auth";

/**
 * Outbound machine-to-machine client: notify Artisanal Futures (AF) about the
 * outcome of a provisioned SimplePress site (owner claimed it, or provisioning
 * failed). POSTs to `${ARTISANAL_FUTURES_API_URL}/simplepress` with the fixed
 * contract body and the partner auth headers (bearer + timestamp + HMAC),
 * per `docs/integrations/artisanal-futures-provisioning.md`.
 *
 * Designed to be called fire-and-forget after a claim, and reused by the
 * onboarding route. It NEVER throws: any error (timeout, network, non-2xx) is
 * reported to Sentry and folded into `{ ok: false }` so a callback failure can
 * never break the caller's own transaction.
 */
export async function notifyArtisanalFuturesClaimed(input: {
  afProvisionCode: string;
  event: "claimed" | "failed";
  status: "ACTIVE" | "FAILED";
  subdomain: string;
  deploymentUrl: string;
  customDomain?: string | null;
  errorMessage?: string | null;
}): Promise<{ ok: boolean; status?: number }> {
  // `afProvisionCode` maps to the contract's `code` field. Serialize ONCE — the
  // HMAC must be computed over the exact bytes we send.
  const rawBody = JSON.stringify({
    code: input.afProvisionCode,
    event: input.event,
    status: input.status,
    subdomain: input.subdomain,
    deploymentUrl: input.deploymentUrl,
    customDomain: input.customDomain ?? null,
    errorMessage: input.errorMessage ?? null,
  });

  const { timestamp, signature } = signPartnerRequest(
    rawBody,
    env.AF_SP_WEBHOOK_SECRET,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${env.ARTISANAL_FUTURES_API_URL}/simplepress`, {
      method: "POST",
      body: rawBody,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ARTISANAL_FUTURES_API_TOKEN}`,
        "X-Partner-Timestamp": String(timestamp),
        "X-Partner-Signature": signature,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      Sentry.captureMessage(
        `Artisanal Futures callback returned non-OK status ${res.status}`,
        {
          level: "warning",
          tags: { service: "artisanal-futures" },
          extra: { code: input.afProvisionCode, event: input.event },
        },
      );
      return { ok: false, status: res.status };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: "artisanal-futures" },
      extra: { code: input.afProvisionCode, event: input.event },
    });
    return { ok: false };
  } finally {
    clearTimeout(timeout);
  }
}
