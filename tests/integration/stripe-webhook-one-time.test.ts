import * as Sentry from "@sentry/nextjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createProduct,
  createVariant,
} from "../helpers/factories";
import {
  makeCheckoutCompletedEvent,
  makeCheckoutExpiredEvent,
  makeCheckoutSession,
  makeEvent,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * CHARACTERIZATION TEST — pins the CURRENT behavior of the one-time
 * (`mode: "payment"`) Stripe webhook path before any subscription code exists.
 *
 * Written deliberately against the real route handler
 * (`src/app/api/webhooks/stripe/route.ts`) and the real test Postgres, so that
 * later work on a parallel subscription lane can prove it left this path
 * untouched: this file must keep passing, unchanged, forever.
 *
 * Everything that would do network I/O is mocked — Stripe (signature
 * verification + session re-read) and the single `sendEmail` chokepoint every
 * template helper funnels through. Sentry stays real (no client initialized,
 * so captures are no-ops) except `captureMessage`, wrapped in a spy so tests
 * can assert on the warnings the handler emits.
 */

// Stripe: the route verifies the signature and re-reads the session on the
// connected account. Both are mocked; `constructEvent` simply returns the
// fixture event the test posted.
const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsRetrieve: vi.fn(),
  listLineItems: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    webhooks: {
      constructEvent: (...args: unknown[]): unknown =>
        stripeMocks.constructEvent(...args),
    },
    checkout: {
      sessions: {
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.sessionsRetrieve(...args),
        listLineItems: (...args: unknown[]): unknown =>
          stripeMocks.listLineItems(...args),
      },
    },
  },
}));

// Email: mocked at `sendEmail` rather than at `templates.ts` so the real
// template helpers still run and we can assert on the Resend `category` tag
// each one attaches — the same discriminator Sentry reads.
const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

// The helper calls the template as a plain function (the element sendEmail
// receives is the layout's, not the template's), so capture the props the
// template was invoked with while still rendering the real component.
type AbandonedTemplateProps = { items?: unknown };
const abandonedTemplate = vi.hoisted(() => ({
  props: vi.fn<(props: AbandonedTemplateProps) => void>(),
}));
vi.mock("~/emails/abandoned-checkout", async (importOriginal) => {
  const actual = await importOriginal<{
    default: (props: AbandonedTemplateProps) => unknown;
  }>();
  return {
    ...actual,
    default: (props: AbandonedTemplateProps) => {
      abandonedTemplate.props(props);
      return actual.default(props);
    },
  };
});

// Sentry: keep the real module (no client initialized, so captures are
// no-ops) but spy on captureMessage, still delegating. A Proxy rather than a
// spread: part of the module's export surface is inherited via its prototype,
// which `{ ...actual }` would drop.
vi.mock("@sentry/nextjs", async (importOriginal) => {
  const actual = await importOriginal<typeof Sentry>();
  const captureMessage = vi.fn(actual.captureMessage);
  return new Proxy(actual, {
    get: (target, prop, receiver) =>
      prop === "captureMessage"
        ? captureMessage
        : (Reflect.get(target, prop, receiver) as unknown),
  });
});

const ACCOUNT_ID = "acct_test_onetime";
const OTHER_ACCOUNT_ID = "acct_test_attacker";

/** The captureMessage call logged for a given `webhook.step` tag, if any. */
function findSentryMessage(step: string) {
  return vi
    .mocked(Sentry.captureMessage)
    .mock.calls.find(
      ([, hint]) =>
        (hint as { tags?: Record<string, string> } | undefined)?.tags?.[
          "webhook.step"
        ] === step,
    );
}

type EmailCall = {
  to: string | string[];
  tags?: Array<{ name: string; value: string }>;
  idempotencyKey?: string;
};

/** The `category` tag of every email the handler sent, in order. */
function emailCategories(): string[] {
  return emailMocks.sendEmail.mock.calls.map((call) => {
    const opts = call[0] as EmailCall;
    return opts.tags?.find((t) => t.name === "category")?.value ?? "untagged";
  });
}

/** The `items` prop the abandoned-checkout template was rendered with. */
function abandonedItemsProp(): unknown {
  expect(abandonedTemplate.props).toHaveBeenCalledTimes(1);
  return abandonedTemplate.props.mock.calls[0]![0].items;
}

function emailCallWithCategory(category: string): EmailCall | undefined {
  return emailMocks.sendEmail.mock.calls
    .map((call) => call[0] as EmailCall)
    .find((opts) =>
      opts.tags?.some((t) => t.name === "category" && t.value === category),
    );
}

async function setupStore(
  opts: {
    sendAbandonedCheckoutEmails?: boolean;
    subdomain?: string;
    stripeAccountId?: string;
  } = {},
) {
  const created = await createBusiness({
    subdomain: opts.subdomain ?? "webhook-biz",
  });
  const business = await db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: opts.stripeAccountId ?? ACCOUNT_ID,
      sendAbandonedCheckoutEmails: opts.sendAbandonedCheckoutEmails ?? false,
    },
  });

  // A plain product (product-level inventory) and a product with a variant
  // (variant-level inventory) — the two branches of the deduction block.
  const product = await createProduct(business.id, {
    name: "Cotton Tee",
    price: 1500,
    inventoryQty: 10,
  });
  const variantProduct = await createProduct(business.id, {
    name: "Stoneware Mug",
    price: 2500,
    inventoryQty: 0,
  });
  const variant = await createVariant(variantProduct.id, {
    name: "Large",
    sku: "MUG-L",
    price: 2500,
    inventoryQty: 5,
  });

  return { business, product, variantProduct, variant };
}

type Store = Awaited<ReturnType<typeof setupStore>>;

/**
 * The canonical paid session: 2 × product + 1 × variant, with tax, shipping and
 * a session-level discount. Totals reconcile the way Stripe reports them:
 * subtotal − discount + shipping + tax = total.
 */
function buildPaidSession(
  store: Store,
  opts: { id?: string; metadata?: Record<string, string> } = {},
) {
  return makeCheckoutSession({
    id: opts.id ?? "cs_test_onetime_1",
    mode: "payment",
    metadata: {
      businessId: store.business.id,
      deliveryMethod: "ship",
      ...(opts.metadata ?? {}),
    },
    customerName: "Jane Doe",
    customerEmail: "Jane@Shopper.Test",
    customerPhone: "+15555550123",
    paymentIntentId: "pi_test_onetime_1",
    amountSubtotal: 5500,
    amountTax: 330,
    amountShipping: 500,
    amountDiscount: 250,
    lineItems: [
      {
        description: "Cotton Tee",
        quantity: 2,
        unitAmount: 1500,
        amountTotal: 3000,
        productId: store.product.id,
      },
      {
        description: "Stoneware Mug",
        quantity: 1,
        unitAmount: 2500,
        amountTotal: 2500,
        productId: store.variantProduct.id,
        productVariantId: store.variant.id,
        variantName: "Large",
        sku: "MUG-L",
      },
    ],
    shippingAddress: {
      line1: "123 Main St",
      line2: "Apt 4",
      city: "Detroit",
      state: "MI",
      postal_code: "48201",
      country: "US",
    },
  });
}

/** Reserves stock for the session, the way `create-session` does at checkout. */
async function reserveFor(store: Store, sessionId: string | null) {
  const reservation = await db.inventoryReservation.create({
    data: {
      businessId: store.business.id,
      stripeSessionId: sessionId,
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      items: [
        { productId: store.product.id, qty: 2 },
        { variantId: store.variant.id, qty: 1 },
      ],
    },
  });
  await db.product.update({
    where: { id: store.product.id },
    data: { reservedQty: 2 },
  });
  await db.productVariant.update({
    where: { id: store.variant.id },
    data: { reservedQty: 1 },
  });
  return reservation;
}

describe("stripe webhook — one-time payment path (characterization)", () => {
  beforeEach(async () => {
    await resetDb();
    stripeMocks.constructEvent.mockReset();
    stripeMocks.sessionsRetrieve.mockReset();
    stripeMocks.listLineItems.mockReset();
    abandonedTemplate.props.mockReset();
    vi.mocked(Sentry.captureMessage).mockClear();
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
  });

  describe("checkout.session.completed", () => {
    it("creates the order, decrements inventory, consumes the reservation and emails both parties", async () => {
      const store = await setupStore();
      const { session, fullSession } = buildPaidSession(store);
      await reserveFor(store, session.id);

      const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      // The session is re-read on the connected account, with the expansions
      // the order/address code depends on.
      expect(stripeMocks.sessionsRetrieve).toHaveBeenCalledTimes(1);
      const retrieveArgs = stripeMocks.sessionsRetrieve.mock.calls[0]!;
      expect(retrieveArgs[0]).toBe(session.id);
      expect(retrieveArgs[1]).toEqual({
        expand: [
          "line_items",
          "line_items.data.price.product",
          "total_details",
          "payment_intent",
        ],
      });
      expect(retrieveArgs[2]).toEqual({ stripeAccount: ACCOUNT_ID });

      // --- Order ---
      const orders = await db.order.findMany({
        where: { businessId: store.business.id },
        include: { items: { orderBy: { price: "asc" } } },
      });
      expect(orders).toHaveLength(1);
      const order = orders[0]!;

      expect(order.orderNumber).toBe(1);
      expect(order.subtotal).toBe(5500);
      expect(order.shipping).toBe(500);
      expect(order.tax).toBe(330);
      expect(order.discount).toBe(250);
      expect(order.total).toBe(6080);
      expect(order.status).toBe("open");
      expect(order.paymentStatus).toBe("paid");
      expect(order.fulfillmentStatus).toBe("unfulfilled");
      expect(order.deliveryMethod).toBe("ship");
      expect(order.stripeSessionId).toBe(session.id);
      expect(order.stripePaymentIntentId).toBe("pi_test_onetime_1");
      expect(order.customerEmail).toBe("jane@shopper.test"); // normalized
      expect(order.customerName).toBe("Jane Doe");
      expect(order.discountCodeId).toBeNull();
      // Platform-terms acceptance is dated from checkout start (Stripe's
      // `session.created`), not from when the webhook wrote the order.
      expect(order.termsAcceptedAt).toEqual(new Date(session.created * 1000));
      expect(order.termsVersion).not.toBeNull();

      // --- Items (mapped out of the expanded line items' product metadata) ---
      expect(order.items).toHaveLength(2);
      const tee = order.items.find((i) => i.productId === store.product.id)!;
      expect(tee.productName).toBe("Cotton Tee");
      expect(tee.productVariantId).toBeNull();
      expect(tee.variantName).toBeNull();
      expect(tee.quantity).toBe(2);
      expect(tee.price).toBe(1500);
      expect(tee.total).toBe(3000);

      const mug = order.items.find(
        (i) => i.productVariantId === store.variant.id,
      )!;
      expect(mug.productId).toBe(store.variantProduct.id);
      expect(mug.productName).toBe("Stoneware Mug");
      expect(mug.variantName).toBe("Large");
      expect(mug.sku).toBe("MUG-L");
      expect(mug.quantity).toBe(1);
      expect(mug.price).toBe(2500);
      expect(mug.total).toBe(2500);

      // --- Inventory ---
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: store.variant.id },
      });
      expect(productAfter.inventoryQty).toBe(8);
      expect(variantAfter.inventoryQty).toBe(4);

      // --- Reservation consumed, held stock released ---
      const reservationAfter = await db.inventoryReservation.findFirstOrThrow({
        where: { stripeSessionId: session.id },
      });
      expect(reservationAfter.status).toBe("consumed");
      expect(productAfter.reservedQty).toBe(0);
      expect(variantAfter.reservedQty).toBe(0);

      // --- InventoryHistory ---
      const history = await db.inventoryHistory.findMany({
        where: { orderId: order.id },
      });
      expect(history).toHaveLength(2);
      expect(history.every((h) => h.reason === "sale")).toBe(true);
      expect(
        history.every((h) => h.note === `Order #${order.orderNumber}`),
      ).toBe(true);

      // --- Customer created + metrics incremented ---
      const customer = await db.customer.findFirstOrThrow({
        where: { businessId: store.business.id },
      });
      expect(customer.email).toBe("jane@shopper.test");
      expect(customer.firstName).toBe("Jane");
      expect(customer.lastName).toBe("Doe");
      expect(customer.orderCount).toBe(1);
      expect(customer.totalSpent).toBe(6080);
      expect(customer.userId).toBeNull();
      expect(order.customerId).toBe(customer.id);

      // --- Shipping address persisted and linked ---
      expect(order.shippingAddressId).not.toBeNull();
      const address = await db.shippingAddress.findUniqueOrThrow({
        where: { id: order.shippingAddressId! },
      });
      expect(address.address1).toBe("123 Main St");
      expect(address.city).toBe("Detroit");
      expect(address.zip).toBe("48201");
      expect(address.country).toBe("US");
      expect(address.customerId).toBe(customer.id);

      // --- Emails: customer confirmation + owner notification ---
      expect(emailCategories()).toEqual([
        "order_confirmation",
        "new_order_owner",
      ]);
      const confirmation = emailCallWithCategory("order_confirmation")!;
      expect(confirmation.to).toBe("jane@shopper.test");
      expect(confirmation.idempotencyKey).toBe(
        `order-confirmation-${session.id}`,
      );
      const ownerEmail = emailCallWithCategory("new_order_owner")!;
      expect(ownerEmail.to).toBe(store.business.ownerEmail);
      expect(ownerEmail.idempotencyKey).toBe(
        `owner-notification-${session.id}`,
      );
    });

    it("is idempotent on replay — one order, one deduction, no duplicate emails", async () => {
      const store = await setupStore();
      const { session, fullSession } = buildPaidSession(store);
      await reserveFor(store, session.id);

      const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      await postWebhookEvent(event);
      emailMocks.sendEmail.mockClear();
      stripeMocks.sessionsRetrieve.mockClear();

      const replay = await postWebhookEvent(event);
      expect(replay.status).toBe(200);
      expect(await replay.json()).toEqual({ received: true });

      // The idempotency guard fires before anything else: no second Stripe read,
      // no second order, no second deduction, no second email.
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(
        await db.order.count({ where: { businessId: store.business.id } }),
      ).toBe(1);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: store.variant.id },
      });
      expect(productAfter.inventoryQty).toBe(8);
      expect(variantAfter.inventoryQty).toBe(4);
      const customer = await db.customer.findFirstOrThrow({
        where: { businessId: store.business.id },
      });
      expect(customer.orderCount).toBe(1);
      expect(customer.totalSpent).toBe(6080);
    });

    it("finds the reservation by metadata.reservationId when it has no stripeSessionId", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, null);
      const { session, fullSession } = buildPaidSession(store, {
        id: "cs_test_resmeta",
        metadata: { reservationId: reservation.id },
      });

      const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);

      const reservationAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(reservationAfter.status).toBe("consumed");
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(productAfter.reservedQty).toBe(0);
    });

    it("does not let a merchant consume another tenant's reservation via metadata.reservationId", async () => {
      // Victim store holds an active reservation under its own session.
      const victimStore = await setupStore();
      const victim = await reserveFor(victimStore, "cs_test_victim_session");

      // The attacker is a different business that legitimately owns its
      // connected account, so the event passes the businessId/account guard and
      // their own order IS created. Their session metadata, though, points
      // reservationId at the victim's reservation.
      const attackerStore = await setupStore({
        subdomain: "attacker-biz",
        stripeAccountId: OTHER_ACCOUNT_ID,
      });
      const { session, fullSession } = buildPaidSession(attackerStore, {
        id: "cs_test_completed_attacker",
        metadata: { reservationId: victim.id },
      });

      const event = makeCheckoutCompletedEvent(session, OTHER_ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);

      // The attacker's own order was created...
      expect(
        await db.order.count({
          where: { businessId: attackerStore.business.id },
        }),
      ).toBe(1);

      // ...but the victim's hold was left alone.
      const victimAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: victim.id },
      });
      expect(victimAfter.status).toBe("active");

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: victimStore.product.id },
      });
      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: victimStore.variant.id },
      });
      expect(productAfter.reservedQty).toBe(2);
      expect(variantAfter.reservedQty).toBe(1);

      // The cross-tenant attempt is surfaced as a warning.
      const warning = findSentryMessage(
        "reservation-release-business-mismatch",
      );
      expect(warning).toBeDefined();
      expect(warning![0]).toContain(victim.id);
      expect(warning![1]).toMatchObject({
        level: "warning",
        tags: { businessId: attackerStore.business.id },
      });
    });

    it("rejects a spoofed event.account: 200, no order, no Stripe read", async () => {
      const store = await setupStore();
      const { session, fullSession } = buildPaidSession(store);

      // A different connected merchant replays our businessId in their own
      // session metadata. The account that produced the event does not own that
      // business, so nothing is written — but Stripe still gets a 200 so it
      // stops retrying.
      const event = makeCheckoutCompletedEvent(session, OTHER_ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
      expect(await db.order.count()).toBe(0);
      expect(await db.customer.count()).toBe(0);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(productAfter.inventoryQty).toBe(10);
    });

    it("returns 200 and writes nothing when metadata.businessId is missing", async () => {
      const store = await setupStore();
      const { session, fullSession } = makeCheckoutSession({
        id: "cs_test_nobiz",
        mode: "payment",
        metadata: {},
        lineItems: [{ productId: store.product.id, quantity: 1 }],
      });

      const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
      expect(await db.order.count()).toBe(0);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("returns 200 and writes nothing when the business has no Stripe account", async () => {
      const store = await setupStore();
      await db.business.update({
        where: { id: store.business.id },
        data: { stripeAccountId: null },
      });
      const { session, fullSession } = buildPaidSession(store);

      const event = makeCheckoutCompletedEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await db.order.count()).toBe(0);
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    });

    it("500s (so Stripe retries) when the event carries no connected account", async () => {
      const store = await setupStore();
      const { session, fullSession } = buildPaidSession(store);

      const event = makeCheckoutCompletedEvent(session, null);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(500);
      expect(await db.order.count()).toBe(0);
    });

    // The ONE deliberate change to this characterization file: this test used
    // to pin a 500 for an unpaid session (so Stripe retried it for ~3 days and
    // the shopper's bank payment never became an order). Delayed payment
    // methods are now supported end-to-end — completed+unpaid acks 200,
    // creates nothing and keeps the stock held until
    // `checkout.session.async_payment_succeeded` / `_failed` settles it. The
    // full lifecycle lives in `stripe-webhook-async-payment.test.ts`.
    it("creates no order for an unpaid (async payment) session, but acks 200 and keeps the stock held", async () => {
      const store = await setupStore();
      const reservation = await reserveFor(store, "cs_test_unpaid");
      const built = makeCheckoutSession({
        id: "cs_test_unpaid",
        mode: "payment",
        metadata: { businessId: store.business.id },
        paymentStatus: "unpaid",
        amountSubtotal: 1500,
        lineItems: [
          {
            description: "Cotton Tee",
            quantity: 1,
            unitAmount: 1500,
            productId: store.product.id,
          },
        ],
      });

      const event = makeCheckoutCompletedEvent(built.session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.sessionsRetrieve.mockResolvedValue(built.fullSession);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await db.order.count()).toBe(0);
      expect(await db.customer.count()).toBe(0);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(productAfter.inventoryQty).toBe(10);
      expect(productAfter.reservedQty).toBe(2);
      const reservationAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(reservationAfter.status).toBe("active");
    });
  });

  describe("checkout.session.expired", () => {
    it("releases an active reservation and sends the abandoned-checkout email when opted in", async () => {
      const store = await setupStore({ sendAbandonedCheckoutEmails: true });
      const { session } = buildPaidSession(store, { id: "cs_test_expired_1" });
      const reservation = await reserveFor(store, session.id);

      const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.listLineItems.mockResolvedValue({
        data: [
          {
            id: "li_1",
            description: "Cotton Tee",
            quantity: 2,
            amount_subtotal: 3000,
            price: {
              unit_amount: 1500,
              product: {
                id: "prod_1",
                name: "Cotton Tee",
                images: ["https://img.test/tee.jpg"],
                metadata: {},
              },
            },
          },
          {
            id: "li_2",
            description: "Large",
            quantity: 1,
            amount_subtotal: 2500,
            price: {
              unit_amount: 2500,
              product: {
                id: "prod_2",
                name: "Stoneware Mug",
                // No product image: create-session falls back to the logo.
                images: [],
                metadata: { variantName: "Large" },
              },
            },
          },
        ],
      });

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      expect(stripeMocks.listLineItems).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({ expand: ["data.price.product"] }),
        { stripeAccount: ACCOUNT_ID },
      );

      const reservationAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(reservationAfter.status).toBe("released");

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: store.variant.id },
      });
      expect(productAfter.reservedQty).toBe(0);
      expect(variantAfter.reservedQty).toBe(0);
      // Physical inventory is untouched — only the hold is returned.
      expect(productAfter.inventoryQty).toBe(10);
      expect(variantAfter.inventoryQty).toBe(5);

      expect(emailCategories()).toEqual(["abandoned_checkout"]);
      const abandoned = emailCallWithCategory("abandoned_checkout")!;
      // Intentional change (2026-10-11): the abandoned-checkout email now uses
      // `sessionShopperEmail`, the same precedence + `normalizeEmail` as the
      // order path, so the address arrives lowercased.
      expect(abandoned.to).toBe("jane@shopper.test");
      expect(abandoned.idempotencyKey).toBe(`abandoned-checkout-${session.id}`);
      expect(abandonedItemsProp()).toEqual([
        {
          name: "Cotton Tee",
          variantName: undefined,
          quantity: 2,
          unitAmount: 1500,
          imageUrl: "https://img.test/tee.jpg",
        },
        {
          name: "Stoneware Mug",
          variantName: "Large",
          quantity: 1,
          unitAmount: 2500,
          imageUrl: undefined,
        },
      ]);

      // No order is ever created from an expired session.
      expect(await db.order.count()).toBe(0);
    });

    it("still sends the abandoned-checkout email, without items, when listing line items fails", async () => {
      const store = await setupStore({ sendAbandonedCheckoutEmails: true });
      const { session } = buildPaidSession(store, { id: "cs_test_expired_4" });
      const reservation = await reserveFor(store, session.id);

      const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);
      stripeMocks.listLineItems.mockRejectedValue(new Error("stripe is down"));

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      expect(emailCategories()).toEqual(["abandoned_checkout"]);
      expect(abandonedItemsProp()).toBeUndefined();

      const reservationAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(reservationAfter.status).toBe("released");
    });

    it("sends no abandoned-checkout email and releases no reservation when the event account does not own the business", async () => {
      const store = await setupStore({ sendAbandonedCheckoutEmails: true });
      const { session } = buildPaidSession(store, { id: "cs_test_expired_5" });
      const reservation = await reserveFor(store, session.id);

      const event = makeCheckoutExpiredEvent(session, OTHER_ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      expect(stripeMocks.listLineItems).not.toHaveBeenCalled();
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();

      // The reservation's business must own the event's connected account, so
      // a foreign-account event leaves the hold untouched.
      const reservationAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(reservationAfter.status).toBe("active");

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: store.variant.id },
      });
      expect(productAfter.reservedQty).toBe(2);
      expect(variantAfter.reservedQty).toBe(1);

      // The skipped release is surfaced as an error, tagged with the victim.
      const releaseMismatch = findSentryMessage(
        "reservation-release-account-mismatch",
      );
      expect(releaseMismatch).toBeDefined();
      expect(releaseMismatch![0]).toContain(OTHER_ACCOUNT_ID);
      expect(releaseMismatch![1]).toMatchObject({
        level: "error",
        tags: { businessId: store.business.id },
      });

      // So is the skipped abandoned-checkout email (this store opted in).
      const emailMismatch = findSentryMessage(
        "abandoned-checkout-account-mismatch",
      );
      expect(emailMismatch).toBeDefined();
      expect(emailMismatch![0]).toContain(OTHER_ACCOUNT_ID);
      expect(emailMismatch![1]).toMatchObject({
        level: "error",
        tags: { businessId: store.business.id },
      });
    });

    it("does not let another tenant release a reservation via metadata.reservationId", async () => {
      // Victim store holds an active reservation under its own session.
      const store = await setupStore();
      const victim = await reserveFor(store, "cs_test_victim_session");

      // A different connected merchant expires one of THEIR sessions, but sets
      // metadata.reservationId to the victim's reservation id.
      const { session } = buildPaidSession(store, {
        id: "cs_test_expired_attacker",
        metadata: { reservationId: victim.id },
      });
      const event = makeCheckoutExpiredEvent(session, OTHER_ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      const victimAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: victim.id },
      });
      expect(victimAfter.status).toBe("active");

      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      const variantAfter = await db.productVariant.findUniqueOrThrow({
        where: { id: store.variant.id },
      });
      expect(productAfter.reservedQty).toBe(2);
      expect(variantAfter.reservedQty).toBe(1);

      // The cross-tenant attempt is surfaced as an error, tagged with the
      // victim's business.
      const releaseMismatch = findSentryMessage(
        "reservation-release-account-mismatch",
      );
      expect(releaseMismatch).toBeDefined();
      expect(releaseMismatch![0]).toContain(OTHER_ACCOUNT_ID);
      expect(releaseMismatch![1]).toMatchObject({
        level: "error",
        tags: { businessId: store.business.id },
      });
    });

    it("releases the reservation but sends no email when the business has opted out", async () => {
      const store = await setupStore({ sendAbandonedCheckoutEmails: false });
      const { session } = buildPaidSession(store, { id: "cs_test_expired_2" });
      const reservation = await reserveFor(store, session.id);

      const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);

      const reservationAfter = await db.inventoryReservation.findUniqueOrThrow({
        where: { id: reservation.id },
      });
      expect(reservationAfter.status).toBe("released");
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
    });

    it("is a no-op for an already-released reservation", async () => {
      const store = await setupStore();
      const { session } = buildPaidSession(store, { id: "cs_test_expired_3" });
      const reservation = await reserveFor(store, session.id);
      await db.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: "released" },
      });
      await db.product.update({
        where: { id: store.product.id },
        data: { reservedQty: 0 },
      });

      const event = makeCheckoutExpiredEvent(session, ACCOUNT_ID);
      stripeMocks.constructEvent.mockReturnValue(event);

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(productAfter.reservedQty).toBe(0);
    });
  });

  describe("envelope handling", () => {
    it("returns 400 on an invalid signature", async () => {
      await setupStore();
      stripeMocks.constructEvent.mockImplementation(() => {
        throw new Error("No signatures found matching the expected signature");
      });

      const event = makeEvent({ type: "payout.paid", object: { id: "po_x" } });
      const res = await postWebhookEvent(event);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid signature" });
      expect(await db.order.count()).toBe(0);
    });

    it("returns 400 when the stripe-signature header is missing", async () => {
      await setupStore();
      const event = makeEvent({ type: "payout.paid", object: { id: "po_x" } });

      const res = await postWebhookEvent(event, { signature: null });

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "No signature" });
      expect(stripeMocks.constructEvent).not.toHaveBeenCalled();
    });

    it("returns 200 and writes nothing for an unknown event type", async () => {
      const store = await setupStore();
      const event = makeEvent({
        type: "payout.paid",
        object: { id: "po_test_1", amount: 1000, status: "paid" },
        account: ACCOUNT_ID,
      });
      stripeMocks.constructEvent.mockReturnValue(event);

      const before = {
        orders: await db.order.count(),
        customers: await db.customer.count(),
        history: await db.inventoryHistory.count(),
        product: await db.product.findUniqueOrThrow({
          where: { id: store.product.id },
        }),
      };

      const res = await postWebhookEvent(event);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });

      expect(await db.order.count()).toBe(before.orders);
      expect(await db.customer.count()).toBe(before.customers);
      expect(await db.inventoryHistory.count()).toBe(before.history);
      const productAfter = await db.product.findUniqueOrThrow({
        where: { id: store.product.id },
      });
      expect(productAfter.inventoryQty).toBe(before.product.inventoryQty);
      expect(productAfter.reservedQty).toBe(before.product.reservedQty);
      expect(emailMocks.sendEmail).not.toHaveBeenCalled();
      expect(stripeMocks.sessionsRetrieve).not.toHaveBeenCalled();
    });
  });
});
