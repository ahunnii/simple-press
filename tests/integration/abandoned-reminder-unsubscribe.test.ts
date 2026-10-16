import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { createUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import {
  abandonedReminderBlock,
  resolveAbandonedCheckoutRecipient,
} from "~/lib/marketing/abandoned-checkout-recipient";
import {
  addToDoNotEmail,
  isOnDoNotEmailList,
} from "~/lib/marketing/do-not-email";
import { resolveUnsubscribePageState } from "~/lib/marketing/unsubscribe";
import { GET, POST } from "~/app/api/unsubscribe/route";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createCustomer } from "../helpers/factories";

/**
 * Abandoned-checkout reminders go to shoppers who never subscribed
 * (`acceptsMarketing: false`). Their footer Unsubscribe link must still ask,
 * record the opt-out on the confirm button, and stop the next reminder — and
 * the done card must not offer them a Resubscribe that would opt them in.
 */

beforeEach(async () => {
  await resetDb();
});

const EMAIL = "shopper@test.dev";

function req(method: "GET" | "POST", token: string, extra = "") {
  return new NextRequest(
    `https://reminder-biz.simplepress.test/api/unsubscribe?t=${encodeURIComponent(token)}${extra}`,
    { method },
  );
}

async function reminderRecipient() {
  const business = await createBusiness({ subdomain: "reminder-biz" });
  const resolved = await resolveAbandonedCheckoutRecipient(db, {
    businessId: business.id,
    email: EMAIL,
    name: "Sam Shopper",
  });
  if (!resolved.ok) throw new Error(`expected a recipient: ${resolved.reason}`);
  const token = createUnsubscribeToken({
    customerId: resolved.customerId,
    businessId: business.id,
  });
  return { business, customerId: resolved.customerId, token };
}

describe("abandoned-checkout reminder recipient who never subscribed", () => {
  it("is asked to confirm (not told they're already unsubscribed) and gets no Resubscribe", async () => {
    const { business, customerId, token } = await reminderRecipient();
    const customer = await db.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    expect(customer.acceptsMarketing).toBe(false);

    expect(await resolveUnsubscribePageState(token, business.id)).toEqual({
      kind: "unsubscribe",
      canResubscribe: false,
    });
  });

  it("GET writes nothing; the confirm POST records stamp + list entry + event, and the next reminder is blocked", async () => {
    const { business, customerId, token } = await reminderRecipient();

    const redirect = await GET(req("GET", token));
    expect(redirect.status).toBe(303);
    expect(
      (await db.customer.findUniqueOrThrow({ where: { id: customerId } }))
        .marketingUnsubscribedAt,
    ).toBeNull();
    expect(await isOnDoNotEmailList(db, business.id, EMAIL)).toBeNull();
    expect(await db.marketingConsentEvent.count()).toBe(0);

    const res = await POST(req("POST", token, "&via=page"));
    expect(res.status).toBe(200);

    const after = await db.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    expect(after.acceptsMarketing).toBe(false);
    expect(after.marketingUnsubscribedAt).toBeInstanceOf(Date);
    expect(after.marketingConsentAt).toBeNull();
    expect(await isOnDoNotEmailList(db, business.id, EMAIL)).toEqual({
      reason: "UNSUBSCRIBED",
    });
    const events = await db.marketingConsentEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      businessId: business.id,
      customerId,
      type: "OPT_OUT",
      source: "UNSUBSCRIBE_LINK",
    });

    expect(abandonedReminderBlock(after)).toBe("unsubscribed");
    expect(
      await resolveAbandonedCheckoutRecipient(db, {
        businessId: business.id,
        email: EMAIL,
      }),
    ).toEqual({ ok: false, reason: "do-not-email" });

    // Reloading the page now shows the done card — still with no Resubscribe.
    expect(await resolveUnsubscribePageState(token, business.id)).toEqual({
      kind: "unsubscribed",
      canResubscribe: false,
    });

    // Repeat press: idempotent.
    await POST(req("POST", token, "&via=page"));
    expect(await db.marketingConsentEvent.count()).toBe(1);
  });

  it("the mail-app one-click POST records it too", async () => {
    const { business, customerId, token } = await reminderRecipient();

    const res = await POST(req("POST", token));

    expect(res.status).toBe(200);
    expect(
      (await db.customer.findUniqueOrThrow({ where: { id: customerId } }))
        .marketingUnsubscribedAt,
    ).toBeInstanceOf(Date);
    expect(await isOnDoNotEmailList(db, business.id, EMAIL)).toEqual({
      reason: "UNSUBSCRIBED",
    });
    expect(await db.marketingConsentEvent.findFirstOrThrow()).toMatchObject({
      type: "OPT_OUT",
      source: "ONE_CLICK",
    });
  });
});

describe("resolveUnsubscribePageState", () => {
  it("shows the done card to someone already unsubscribed, with Resubscribe only if they had consented", async () => {
    const business = await createBusiness({ subdomain: "reminder-biz" });
    const former = await createCustomer(business.id, { email: "f@test.dev" });
    await db.customer.update({
      where: { id: former.id },
      data: {
        acceptsMarketing: false,
        marketingConsentAt: new Date("2026-10-01T00:00:00Z"),
        marketingConsentSource: "CHECKOUT",
        marketingUnsubscribedAt: new Date("2026-10-05T00:00:00Z"),
      },
    });
    const never = await createCustomer(business.id, { email: "n@test.dev" });
    await db.customer.update({
      where: { id: never.id },
      data: { marketingUnsubscribedAt: new Date("2026-10-05T00:00:00Z") },
    });

    const tokenFor = (customerId: string) =>
      createUnsubscribeToken({ customerId, businessId: business.id });

    expect(
      await resolveUnsubscribePageState(tokenFor(former.id), business.id),
    ).toEqual({ kind: "unsubscribed", canResubscribe: true });
    expect(
      await resolveUnsubscribePageState(tokenFor(never.id), business.id),
    ).toEqual({ kind: "unsubscribed", canResubscribe: false });
  });

  it("treats a do-not-email listing or a suppression as already unsubscribed", async () => {
    const business = await createBusiness({ subdomain: "reminder-biz" });
    const listed = await createCustomer(business.id, { email: "l@test.dev" });
    await addToDoNotEmail(db, business.id, "l@test.dev", "HARD_BOUNCE");
    const suppressed = await createCustomer(business.id, {
      email: "s@test.dev",
    });
    await db.customer.update({
      where: { id: suppressed.id },
      data: {
        marketingSuppressedAt: new Date(),
        marketingSuppressionReason: "COMPLAINT",
      },
    });

    for (const c of [listed, suppressed]) {
      expect(
        await resolveUnsubscribePageState(
          createUnsubscribeToken({
            customerId: c.id,
            businessId: business.id,
          }),
          business.id,
        ),
      ).toMatchObject({ kind: "unsubscribed" });
    }
  });

  it("asks a current subscriber (and someone who re-subscribed after an unsubscribe) to confirm", async () => {
    const business = await createBusiness({ subdomain: "reminder-biz" });
    const resubbed = await createCustomer(business.id, { email: "r@test.dev" });
    await db.customer.update({
      where: { id: resubbed.id },
      data: {
        acceptsMarketing: true,
        marketingUnsubscribedAt: new Date("2026-10-01T00:00:00Z"),
        marketingConsentAt: new Date("2026-10-05T00:00:00Z"),
        marketingConsentSource: "RESUBSCRIBE_LINK",
      },
    });

    expect(
      await resolveUnsubscribePageState(
        createUnsubscribeToken({
          customerId: resubbed.id,
          businessId: business.id,
        }),
        business.id,
      ),
    ).toEqual({ kind: "unsubscribe", canResubscribe: true });
  });

  it("rejects a token for another store or an erased customer", async () => {
    const business = await createBusiness({ subdomain: "reminder-biz" });
    const other = await createBusiness({ subdomain: "reminder-other" });
    const c = await createCustomer(other.id);
    const token = createUnsubscribeToken({
      customerId: c.id,
      businessId: other.id,
    });
    expect(await resolveUnsubscribePageState(token, business.id)).toEqual({
      kind: "invalid",
    });

    await db.customer.update({
      where: { id: c.id },
      data: { anonymizedAt: new Date() },
    });
    expect(await resolveUnsubscribePageState(token, other.id)).toEqual({
      kind: "invalid",
    });
  });
});
