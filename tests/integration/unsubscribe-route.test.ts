import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { getBusinessUrl } from "~/lib/business-url";
import { createUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { isOnDoNotEmailList } from "~/lib/marketing/do-not-email";
import { GET, POST } from "~/app/api/unsubscribe/route";

import { db, resetDb } from "../helpers/db";
import { createBusiness, createCustomer } from "../helpers/factories";

/**
 * /api/unsubscribe: GET must be side-effect free (link scanners prefetch it)
 * and only redirect to the store's confirm page; POST (mail-client one-click,
 * or the confirm button with `via=page`) unsubscribes and writes the consent
 * log. NOT YET RUN: needs the test database.
 */

const IP = "203.0.113.7";
const UA = "UnsubscribeRouteTest/1.0";

beforeEach(async () => {
  await resetDb();
});

function req(
  method: "GET" | "POST",
  token: string,
  extra = "",
  headers: Record<string, string> = {},
) {
  return new NextRequest(
    `https://unsub-biz.simplepress.test/api/unsubscribe?t=${encodeURIComponent(token)}${extra}`,
    { method, headers },
  );
}

async function setup(opts: { subscribed?: boolean } = {}) {
  const business = await createBusiness({ subdomain: "unsub-biz" });
  const customer = await createCustomer(business.id, { email: "u@test.dev" });
  if (opts.subscribed ?? true) {
    await db.customer.update({
      where: { id: customer.id },
      data: {
        acceptsMarketing: true,
        marketingConsentAt: new Date(),
        marketingConsentSource: "CHECKOUT",
      },
    });
  }
  const token = createUnsubscribeToken({
    customerId: customer.id,
    businessId: business.id,
  });
  return { business, customer, token };
}

describe("GET /api/unsubscribe", () => {
  it("does not unsubscribe: no customer change, no consent event, redirects to s=confirm", async () => {
    const { business, customer, token } = await setup();

    const res = await GET(req("GET", token));

    expect(res.status).toBe(303);
    const target = new URL(res.headers.get("location")!);
    expect(target.origin).toBe(getBusinessUrl(business));
    expect(target.pathname).toBe("/email-preferences");
    expect(target.searchParams.get("s")).toBe("confirm");
    expect(target.searchParams.get("t")).toBe(token);

    const after = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(after.acceptsMarketing).toBe(true);
    expect(after.marketingUnsubscribedAt).toBeNull();
    expect(await db.marketingConsentEvent.count()).toBe(0);
    expect(await isOnDoNotEmailList(db, business.id, "u@test.dev")).toBeNull();
  });

  it("renders the error page for a missing or tampered token and changes nothing", async () => {
    const { customer, token } = await setup();

    const bad = await GET(req("GET", `${token}x`));
    expect(bad.status).toBe(400);
    const missing = await GET(
      new NextRequest("https://unsub-biz.simplepress.test/api/unsubscribe"),
    );
    expect(missing.status).toBe(400);

    const after = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(after.acceptsMarketing).toBe(true);
  });

  it("keeps the placeholder test-email page", async () => {
    const res = await GET(req("GET", "test"));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("This is a test email");
  });
});

describe("POST /api/unsubscribe", () => {
  it("one-click from a mail client unsubscribes and logs OPT_OUT / ONE_CLICK with request meta", async () => {
    const { business, customer, token } = await setup();

    const res = await POST(
      req("POST", token, "", { "x-forwarded-for": IP, "user-agent": UA }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true });
    const after = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(after.acceptsMarketing).toBe(false);
    expect(after.marketingUnsubscribedAt).toBeInstanceOf(Date);

    const events = await db.marketingConsentEvent.findMany();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      businessId: business.id,
      customerId: customer.id,
      type: "OPT_OUT",
      source: "ONE_CLICK",
      userAgent: UA,
      campaignId: null,
    });
    expect(events[0]!.ip).toBeTruthy();
    expect(await isOnDoNotEmailList(db, business.id, "u@test.dev")).toEqual({
      reason: "UNSUBSCRIBED",
    });
  });

  it("the confirm-button path (via=page) logs source UNSUBSCRIBE_LINK and the campaign from the recipient claim", async () => {
    const { business, customer } = await setup();
    const campaign = await db.marketingCampaign.create({
      data: { businessId: business.id, subject: "Hello", status: "SENT" },
    });
    const recipient = await db.marketingCampaignRecipient.create({
      data: {
        campaignId: campaign.id,
        businessId: business.id,
        customerId: customer.id,
        email: "u@test.dev",
        batchIndex: 0,
        status: "DELIVERED",
      },
    });
    const token = createUnsubscribeToken({
      customerId: customer.id,
      businessId: business.id,
      r: recipient.id,
    });

    const res = await POST(req("POST", token, "&via=page"));

    expect(res.status).toBe(200);
    const event = await db.marketingConsentEvent.findFirstOrThrow();
    expect(event).toMatchObject({
      type: "OPT_OUT",
      source: "UNSUBSCRIBE_LINK",
      campaignId: campaign.id,
    });
    expect(
      (
        await db.marketingCampaignRecipient.findUniqueOrThrow({
          where: { id: recipient.id },
        })
      ).unsubscribedAt,
    ).toBeInstanceOf(Date);
  });

  it("is idempotent: a second POST keeps the first timestamp and logs no second event", async () => {
    const { customer, token } = await setup();

    await POST(req("POST", token));
    const first = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    const again = await POST(req("POST", token));

    expect(again.status).toBe(200);
    const second = await db.customer.findUniqueOrThrow({
      where: { id: customer.id },
    });
    expect(second.marketingUnsubscribedAt).toEqual(
      first.marketingUnsubscribedAt,
    );
    expect(await db.marketingConsentEvent.count()).toBe(1);
  });

  it("logs no event for a customer who was never subscribed", async () => {
    const { customer, token } = await setup({ subscribed: false });

    const res = await POST(req("POST", token));

    expect(res.status).toBe(200);
    expect(await db.marketingConsentEvent.count()).toBe(0);
    expect(
      (await db.customer.findUniqueOrThrow({ where: { id: customer.id } }))
        .marketingUnsubscribedAt,
    ).toBeInstanceOf(Date);
  });

  it("rejects a tampered token with 400 and changes nothing", async () => {
    const { customer, token } = await setup();

    const res = await POST(req("POST", `${token}x`));

    expect(res.status).toBe(400);
    expect(
      (await db.customer.findUniqueOrThrow({ where: { id: customer.id } }))
        .acceptsMarketing,
    ).toBe(true);
    expect(await db.marketingConsentEvent.count()).toBe(0);
  });

  it("never touches the database for the placeholder test token", async () => {
    const res = await POST(req("POST", "test"));
    expect(res.status).toBe(200);
    expect(await db.marketingConsentEvent.count()).toBe(0);
  });
});
