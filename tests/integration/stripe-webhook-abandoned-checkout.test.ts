import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { addToDoNotEmail } from "~/lib/marketing/do-not-email";

import { db, resetDb } from "../helpers/db";
import { createBusiness } from "../helpers/factories";
import { fakeListLineItems } from "../helpers/stripe-line-items";
import {
  makeCheckoutExpiredEvent,
  makeCheckoutSession,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * Abandoned-checkout reminders go to shoppers who never subscribed, so they
 * are sent as commercial email: they need the store's postal address, honor
 * every opt-out (do-not-email list, unsubscribe, suppression, erasure), and
 * carry the marketing footer + RFC 8058 one-click unsubscribe headers.
 *
 * Drives the real webhook route against the test Postgres; Stripe, the
 * `sendEmail` chokepoint and Sentry's captureMessage/addBreadcrumb are mocked.
 */

const stripeMocks = vi.hoisted(() => ({ constructEvent: vi.fn() }));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    webhooks: {
      constructEvent: (...args: unknown[]): unknown =>
        stripeMocks.constructEvent(...args),
    },
    checkout: {
      sessions: {
        listLineItems: (...args: unknown[]): unknown =>
          fakeListLineItems(...args),
      },
    },
  },
}));

const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
    MARKETING: "marketing@test.dev",
  },
}));

// Captures the props the template was rendered with (footer inputs).
type TemplateProps = { unsubscribeUrl?: string; postalAddress?: string | null };
const templateProps = vi.hoisted(() => ({
  props: vi.fn<(props: TemplateProps) => void>(),
}));
vi.mock("~/emails/abandoned-checkout", async (importOriginal) => {
  const actual = await importOriginal<{
    default: (props: TemplateProps) => unknown;
  }>();
  return {
    ...actual,
    default: (props: TemplateProps) => {
      templateProps.props(props);
      return actual.default(props);
    },
  };
});

vi.mock("@sentry/nextjs", async (importOriginal) => {
  const actual = await importOriginal<typeof Sentry>();
  const captureMessage = vi.fn(actual.captureMessage);
  const addBreadcrumb = vi.fn(actual.addBreadcrumb);
  return new Proxy(actual, {
    get: (target, prop, receiver) =>
      prop === "captureMessage"
        ? captureMessage
        : prop === "addBreadcrumb"
          ? addBreadcrumb
          : (Reflect.get(target, prop, receiver) as unknown),
  });
});

const ACCOUNT_ID = "acct_test_abandoned";
const SHOPPER_EMAIL = "jane@shopper.test";

type EmailCall = {
  to: string | string[];
  headers?: Record<string, string>;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;
};

async function setupStore(opts: { withAddress?: boolean } = {}) {
  const created = await createBusiness({ subdomain: "abandoned-biz" });
  return db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: ACCOUNT_ID,
      sendAbandonedCheckoutEmails: true,
      ...(opts.withAddress === false
        ? {}
        : {
            addressStreet: "123 Main St",
            addressCity: "Detroit",
            addressState: "MI",
            addressPostalCode: "48201",
          }),
    },
  });
}

async function expireSession(businessId: string, id: string) {
  const { session } = makeCheckoutSession({
    id,
    mode: "payment",
    paymentStatus: "unpaid",
    metadata: { businessId },
    customerName: "Jane Doe",
    customerEmail: "Jane@Shopper.Test",
    lineItems: [{ description: "Cotton Tee", quantity: 1, unitAmount: 1500 }],
  });
  const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
  stripeMocks.constructEvent.mockReturnValue(event);
  const res = await postWebhookEvent(event);
  expect(res.status).toBe(200);
  return session;
}

function skipBreadcrumbReason(): unknown {
  const crumb = vi
    .mocked(Sentry.addBreadcrumb)
    .mock.calls.find(([b]) => b.category === "webhook.abandoned-checkout");
  return (crumb?.[0].data as { reason?: string } | undefined)?.reason;
}

describe("stripe webhook — abandoned-checkout reminder compliance", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.constructEvent.mockReset();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
    templateProps.props.mockReset();
    vi.mocked(Sentry.captureMessage).mockClear();
    vi.mocked(Sentry.addBreadcrumb).mockClear();
  });

  it("sends to a non-subscriber with the footer and one-click unsubscribe headers", async () => {
    const business = await setupStore();
    const session = await expireSession(business.id, "cs_test_abandon_ok");

    // A Customer was created for the shopper — never opted in.
    const customer = await db.customer.findUniqueOrThrow({
      where: {
        businessId_email: { businessId: business.id, email: SHOPPER_EMAIL },
      },
    });
    expect(customer.acceptsMarketing).toBe(false);
    expect(customer.marketingConsentAt).toBeNull();

    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
    const call = emailMocks.sendEmail.mock.calls[0]![0] as EmailCall;
    expect(call.to).toBe(SHOPPER_EMAIL);
    expect(call.idempotencyKey).toBe(`abandoned-checkout-${session.id}`);

    const listUnsubscribe = call.headers?.["List-Unsubscribe"];
    expect(call.headers?.["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    const url = new URL(listUnsubscribe!.replace(/^<|>$/g, ""));
    expect(url.pathname).toBe("/api/unsubscribe");
    expect(verifyUnsubscribeToken(url.searchParams.get("t")!)).toEqual({
      customerId: customer.id,
      businessId: business.id,
    });

    expect(templateProps.props).toHaveBeenCalledTimes(1);
    const props = templateProps.props.mock.calls[0]![0];
    expect(`<${props.unsubscribeUrl}>`).toBe(listUnsubscribe);
    expect(props.postalAddress).toBe("123 Main St, Detroit, MI 48201");
  });

  it("does not change acceptsMarketing on an existing subscriber", async () => {
    const business = await setupStore();
    await db.customer.create({
      data: {
        businessId: business.id,
        email: SHOPPER_EMAIL,
        acceptsMarketing: true,
        marketingConsentAt: new Date(),
        marketingConsentSource: "NEWSLETTER_FORM",
      },
    });
    await expireSession(business.id, "cs_test_abandon_subscriber");

    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
    const customer = await db.customer.findUniqueOrThrow({
      where: {
        businessId_email: { businessId: business.id, email: SHOPPER_EMAIL },
      },
    });
    expect(customer.acceptsMarketing).toBe(true);
  });

  it("skips a shopper who unsubscribed", async () => {
    const business = await setupStore();
    await db.customer.create({
      data: {
        businessId: business.id,
        email: SHOPPER_EMAIL,
        marketingUnsubscribedAt: new Date(),
      },
    });
    await expireSession(business.id, "cs_test_abandon_unsub");

    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(skipBreadcrumbReason()).toBe("unsubscribed");
  });

  it("sends to a shopper who re-subscribed after unsubscribing", async () => {
    const business = await setupStore();
    await db.customer.create({
      data: {
        businessId: business.id,
        email: SHOPPER_EMAIL,
        acceptsMarketing: true,
        marketingUnsubscribedAt: new Date("2026-10-01T00:00:00Z"),
        marketingConsentAt: new Date("2026-10-10T00:00:00Z"),
        marketingConsentSource: "RESUBSCRIBE_LINK",
      },
    });
    await expireSession(business.id, "cs_test_abandon_resub");

    expect(emailMocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("skips a suppressed shopper", async () => {
    const business = await setupStore();
    await db.customer.create({
      data: {
        businessId: business.id,
        email: SHOPPER_EMAIL,
        marketingSuppressedAt: new Date(),
        marketingSuppressionReason: "HARD_BOUNCE",
      },
    });
    await expireSession(business.id, "cs_test_abandon_suppressed");

    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(skipBreadcrumbReason()).toBe("suppressed");
  });

  it("skips an anonymized customer row", async () => {
    const business = await setupStore();
    // Erasure rewrites the email to a placeholder in practice; this pins the
    // defensive check for a row still matching the shopper's address.
    await db.customer.create({
      data: {
        businessId: business.id,
        email: SHOPPER_EMAIL,
        anonymizedAt: new Date(),
      },
    });
    await expireSession(business.id, "cs_test_abandon_anonymized");

    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(skipBreadcrumbReason()).toBe("anonymized");
  });

  it("skips an address on the store's do-not-email list without creating a customer", async () => {
    const business = await setupStore();
    await addToDoNotEmail(db, business.id, SHOPPER_EMAIL, "COMPLAINT");
    await expireSession(business.id, "cs_test_abandon_dne");

    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    expect(skipBreadcrumbReason()).toBe("do-not-email");
    expect(
      await db.customer.count({ where: { businessId: business.id } }),
    ).toBe(0);
    // An opt-out working as intended is not an error-level event.
    expect(
      vi
        .mocked(Sentry.captureMessage)
        .mock.calls.some(
          ([, hint]) => (hint as { level?: string })?.level === "error",
        ),
    ).toBe(false);
  });

  it("skips (info-level) when the store has no postal address", async () => {
    const business = await setupStore({ withAddress: false });
    await expireSession(business.id, "cs_test_abandon_no_address");

    expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    const message = vi
      .mocked(Sentry.captureMessage)
      .mock.calls.find(
        ([, hint]) =>
          (hint as { tags?: Record<string, string> } | undefined)?.tags?.[
            "webhook.step"
          ] === "abandoned-checkout-no-address",
      );
    expect(message).toBeDefined();
    expect(message![1]).toMatchObject({
      level: "info",
      tags: { businessId: business.id },
    });
    // No customer row is created for a reminder that can't be sent.
    expect(
      await db.customer.count({ where: { businessId: business.id } }),
    ).toBe(0);
  });
});
