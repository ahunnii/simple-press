import type { ResendBatchEmail, ResendBatchResult } from "~/lib/email/resend";
import type { SendBatchFn } from "~/lib/marketing/campaign-worker";
import type { Throttle } from "~/lib/marketing/send-throttle";

import { db } from "./db";
import { createBusiness, createOwnerUser } from "./factories";

/**
 * Shared seeding + fakes for the email-campaign integration tests
 * (`marketing-campaign-worker.test.ts`, `marketing-router.test.ts`).
 */

/** A store with the emailMarketing flag on, a postal address, and its owner. */
export async function createMarketingStore(
  subdomain: string,
  opts: { flag?: boolean; address?: boolean } = {},
) {
  const business = await createBusiness({
    subdomain,
    name: "Bloom & Co",
    featureFlags: { emailMarketing: opts.flag ?? true },
  });
  if (opts.address ?? true) {
    await db.business.update({
      where: { id: business.id },
      data: {
        addressStreet: "1 Main St",
        addressCity: "Detroit",
        addressState: "MI",
        addressPostalCode: "48201",
      },
    });
  }
  const owner = await createOwnerUser(business.id);
  return { business, owner, host: `${subdomain}.simplepress.test` };
}

/** `count` opted-in customers with predictable emails. */
export async function seedSubscribers(
  businessId: string,
  count: number,
  prefix = "sub",
) {
  await db.customer.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      businessId,
      email: `${prefix}-${String(i).padStart(4, "0")}@test.dev`,
      acceptsMarketing: true,
    })),
  });
}

export async function createDraft(businessId: string, subject = "Spring sale") {
  return db.marketingCampaign.create({
    data: {
      businessId,
      subject,
      previewText: "Twenty percent off everything",
      contentFormat: "text",
      bodyText: "Hello!\n\nEverything is 20% off this week.",
    },
  });
}

/** A throttle that never waits. */
export const noWaitThrottle: Throttle = { acquire: () => Promise.resolve() };

export type SendCall = { emails: ResendBatchEmail[]; idempotencyKey: string };

/**
 * A fake `sendResendBatch` that records every call. The default response
 * accepts every email with an id derived from the key + position (stable
 * across retries of the same key, like Resend's idempotent replay).
 */
export function fakeSend(
  respond?: (
    call: SendCall,
    n: number,
  ) => ResendBatchResult | Promise<ResendBatchResult>,
) {
  const calls: SendCall[] = [];
  const fn: SendBatchFn = async (emails, opts) => {
    const call = { emails, idempotencyKey: opts.idempotencyKey };
    calls.push(call);
    return respond ? respond(call, calls.length) : accepted(call);
  };
  return { fn, calls };
}

export function accepted(call: SendCall): ResendBatchResult {
  return {
    data: call.emails.map((_, i) => ({ id: `re_${call.idempotencyKey}_${i}` })),
    errors: [],
    error: null,
  };
}

export function apiError(
  name: string,
  statusCode: number | null,
  extra: { timedOut?: boolean } = {},
): ResendBatchResult {
  return {
    data: null,
    errors: [],
    error: { name, statusCode, message: `${name} (${statusCode})`, ...extra },
  };
}

/** A controllable clock plus a `sleep` that advances it instead of waiting. */
export function fakeClock(start = new Date()) {
  let t = start.getTime();
  const sleeps: number[] = [];
  return {
    now: () => new Date(t),
    advance: (ms: number) => {
      t += ms;
    },
    sleep: (ms: number) => {
      sleeps.push(ms);
      t += ms;
      return Promise.resolve();
    },
    sleeps,
  };
}
