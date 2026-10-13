import type { Prisma } from "generated/prisma";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredLineConfigs } from "~/lib/checkout/customizer-checkout";
import type { ReservationEntry } from "~/lib/inventory/reservation";
import { readCustomizationSnapshot } from "~/lib/customizer/display";
import { sweepStaleReservations } from "~/lib/inventory/reservation";
import { POST as createSession } from "~/app/api/stripe/create-session/route";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createOwnerUser,
  createProduct,
  createVariant,
} from "../helpers/factories";
import {
  makeCheckoutAsyncPaymentSucceededEvent,
  makeCheckoutCompletedEvent,
  makeCheckoutSession,
  postWebhookEvent,
} from "../helpers/stripe-webhook";

/**
 * Product customizer × money path: real create-session + webhook route
 * handlers and order router against the test Postgres; Stripe, the checkout
 * rate limiter and email are mocked.
 *
 * The glove: a Pink variant ($40), a REQUIRED chain (Silver +$10,
 * standalone), up to 3 charms (Bee and Heart are variants of an UNPUBLISHED
 * stocked charm product; Star is standalone +$8) and an optional $5
 * engraving.
 */

const ACCOUNT_ID = "acct_test_customizer";
const PLATFORM_DOMAIN = "simplepress.test";
const SUBDOMAIN = "glove-biz";

const stripeMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  sessionsRetrieve: vi.fn(),
  sessionsCreate: vi.fn(),
  sessionsExpire: vi.fn(),
  listLineItems: vi.fn(),
  couponsCreate: vi.fn(),
  customersCreate: vi.fn(),
  refundsCreate: vi.fn(),
  chargesRetrieve: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    webhooks: {
      constructEvent: (...args: unknown[]): unknown =>
        stripeMocks.constructEvent(...args),
    },
    coupons: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.couponsCreate(...args),
    },
    customers: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.customersCreate(...args),
    },
    refunds: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.refundsCreate(...args),
    },
    charges: {
      retrieve: (...args: unknown[]): unknown =>
        stripeMocks.chargesRetrieve(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]): unknown =>
          stripeMocks.sessionsCreate(...args),
        retrieve: (...args: unknown[]): unknown =>
          stripeMocks.sessionsRetrieve(...args),
        expire: (...args: unknown[]): unknown =>
          stripeMocks.sessionsExpire(...args),
        listLineItems: (...args: unknown[]): unknown =>
          stripeMocks.listLineItems(...args),
      },
    },
  },
}));

vi.mock("~/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    checkoutLimiter: { consume: vi.fn().mockResolvedValue(undefined) },
    subscriptionCheckoutLimiter: {
      consume: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve(new Headers({ host: `${SUBDOMAIN}.${PLATFORM_DOMAIN}` })),
  cookies: () => Promise.resolve(new Headers()),
}));

const emailMocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));
vi.mock("~/lib/email/send", () => ({
  sendEmail: (...args: unknown[]): unknown => emailMocks.sendEmail(...args),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
  },
}));

const BASE_FLAGS = {
  products: true,
  cart: true,
  checkout: true,
  orders: true,
  payments: true,
  productOptions: true,
};

async function setupStore(
  opts: { flags?: Record<string, boolean>; beeQty?: number } = {},
) {
  const created = await createBusiness({ subdomain: SUBDOMAIN });
  const business = await db.business.update({
    where: { id: created.id },
    data: {
      stripeAccountId: ACCOUNT_ID,
      offersInStorePickup: true,
      featureFlags: (opts.flags ?? BASE_FLAGS) as Prisma.InputJsonValue,
    },
  });
  const glove = await createProduct(business.id, {
    name: "Glove",
    price: 4000,
    inventoryQty: 0,
  });
  const pink = await createVariant(glove.id, {
    name: "Pink",
    price: 4000,
    inventoryQty: 10,
  });
  // The charms: a stocked product the owner does NOT list in the shop.
  const charm = await createProduct(business.id, {
    name: "Charm",
    price: 1500,
    published: false,
    inventoryQty: 0,
  });
  const bee = await createVariant(charm.id, {
    name: "Bee",
    price: 1500,
    inventoryQty: opts.beeQty ?? 1,
  });
  const heart = await createVariant(charm.id, {
    name: "Heart",
    price: 1200,
    inventoryQty: 5,
  });

  const chain = await db.productOptionGroup.create({
    data: {
      businessId: business.id,
      name: "Chain",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      values: { create: [{ label: "Silver", priceDelta: 1000 }] },
    },
    include: { values: true },
  });
  const charms = await db.productOptionGroup.create({
    data: {
      businessId: business.id,
      name: "Charms",
      maxSelections: 3,
      values: {
        create: [
          {
            label: "Bee",
            linkedProductId: charm.id,
            linkedVariantId: bee.id,
            sortOrder: 0,
          },
          {
            label: "Heart",
            linkedProductId: charm.id,
            linkedVariantId: heart.id,
            sortOrder: 1,
          },
          { label: "Star", priceDelta: 800, sortOrder: 2 },
        ],
      },
    },
    include: { values: { orderBy: { sortOrder: "asc" } } },
  });
  const engraving = await db.productOptionGroup.create({
    data: {
      businessId: business.id,
      name: "Engraving",
      kind: "text",
      maxLength: 12,
      textPriceCents: 500,
    },
  });
  for (const [sortOrder, group] of [chain, charms, engraving].entries()) {
    await db.productOptionGroupOnProduct.create({
      data: { productId: glove.id, groupId: group.id, sortOrder },
    });
  }
  const [beeValue, heartValue, starValue] = charms.values;
  return {
    business,
    glove,
    pink,
    charm,
    bee,
    heart,
    chain,
    charms,
    engraving,
    silver: chain.values[0]!,
    beeValue: beeValue!,
    heartValue: heartValue!,
    starValue: starValue!,
  };
}

type Store = Awaited<ReturnType<typeof setupStore>>;

function build(
  store: Store,
  opts: { charms?: string[]; engraving?: string; chain?: boolean } = {},
) {
  return {
    choices: [
      ...(opts.chain === false
        ? []
        : [{ groupId: store.chain.id, valueIds: [store.silver.id] }]),
      ...(opts.charms
        ? [{ groupId: store.charms.id, valueIds: opts.charms }]
        : []),
    ],
    texts:
      opts.engraving !== undefined
        ? [{ groupId: store.engraving.id, text: opts.engraving }]
        : [],
  };
}

type PostedItem = {
  productId: string;
  variantId: string | null;
  quantity?: number;
  configuration?: unknown;
  lineKey?: string;
  price?: number;
  productName?: string;
  variantName?: string | null;
};

let sessionCounter = 0;

async function startCheckout(items: PostedItem[]) {
  sessionCounter += 1;
  const sessionId = `cs_test_custom_${sessionCounter}`;
  stripeMocks.sessionsCreate.mockResolvedValueOnce({
    id: sessionId,
    url: `https://checkout.stripe.test/${sessionId}`,
  });
  const host = `${SUBDOMAIN}.${PLATFORM_DOMAIN}`;
  const req = new Request(`https://${host}/api/stripe/create-session`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host,
      "x-forwarded-for": "203.0.113.20",
    },
    body: JSON.stringify({
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName ?? "Glove",
        variantName: item.variantName ?? null,
        price: item.price ?? 4000,
        quantity: item.quantity ?? 1,
        imageUrl: null,
        ...(item.configuration ? { configuration: item.configuration } : {}),
        ...(item.lineKey ? { lineKey: item.lineKey } : {}),
      })),
      customerInfo: { email: "jane@shopper.test", name: "Jane Doe" },
      deliveryMethod: "pickup",
    }),
  });
  const res = await createSession(req as never);
  const body = (await res.json()) as Record<string, unknown>;
  const lastCall = stripeMocks.sessionsCreate.mock.lastCall as
    | [Stripe.Checkout.SessionCreateParams]
    | undefined;
  return {
    res,
    body,
    sessionId,
    params: res.status === 200 ? lastCall?.[0] : undefined,
  };
}

/** The session Stripe would echo back for what create-session sent. */
function echoSession(
  sessionId: string,
  params: Stripe.Checkout.SessionCreateParams,
  paymentStatus: "paid" | "unpaid" = "paid",
) {
  const lineItems = (params.line_items ?? []).map((li) => {
    const data = li.price_data!;
    const meta = { ...(data.product_data!.metadata ?? {}) } as Record<
      string,
      string
    >;
    const { productId, productVariantId, variantName, sku, ...extra } = meta;
    return {
      description: data.product_data!.name,
      quantity: li.quantity ?? 1,
      unitAmount: data.unit_amount!,
      productId: productId === "" ? undefined : productId,
      productVariantId: productVariantId === "" ? undefined : productVariantId,
      variantName: variantName === "" ? undefined : variantName,
      sku: sku === "" ? undefined : sku,
      extraMetadata: extra,
    };
  });
  const subtotal = lineItems.reduce(
    (sum, li) => sum + li.unitAmount * li.quantity,
    0,
  );
  return makeCheckoutSession({
    id: sessionId,
    metadata: params.metadata as Record<string, string>,
    paymentStatus,
    amountSubtotal: subtotal,
    lineItems,
  });
}

async function postEvent(event: Stripe.Event) {
  stripeMocks.constructEvent.mockReturnValue(event);
  const res = await postWebhookEvent(event);
  expect(res.status).toBe(200);
}

async function payCheckout(
  sessionId: string,
  params: Stripe.Checkout.SessionCreateParams,
) {
  const { session, fullSession } = echoSession(sessionId, params);
  stripeMocks.sessionsRetrieve.mockResolvedValue(fullSession);
  await postEvent(makeCheckoutCompletedEvent(session, ACCOUNT_ID));
  return db.order.findUniqueOrThrow({
    where: { stripeSessionId: sessionId },
    include: { items: true },
  });
}

async function stockOf(variantId: string) {
  return db.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    select: { inventoryQty: true, reservedQty: true },
  });
}

const UNAVAILABLE_ERROR =
  "Some items in your cart are out of stock or no longer available. Please update your cart and try again.";

describe("product customizer checkout", () => {
  beforeEach(async () => {
    await resetDb();
    for (const mock of Object.values(stripeMocks)) mock.mockReset();
    stripeMocks.listLineItems.mockResolvedValue({ data: [] });
    stripeMocks.customersCreate.mockResolvedValue({ id: "cus_test" });
    emailMocks.sendEmail.mockReset();
    emailMocks.sendEmail.mockResolvedValue({ success: true, id: "test" });
  });

  describe("create-session", () => {
    it("re-prices from ids and builds the Stripe line from the database, ignoring client price and names", async () => {
      const store = await setupStore();
      const { res, params } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          price: 1,
          productName: "Free glove",
          variantName: "Whatever",
          lineKey: "client-line-1",
          configuration: build(store, {
            charms: [store.beeValue.id, store.starValue.id],
            engraving: "  Amy  ",
          }),
        },
      ]);
      expect(res.status).toBe(200);

      const line = params!.line_items![0]!;
      // 4000 base + Silver 1000 + Bee 1500 (linked variant price) + Star 800
      // + engraving 500.
      expect(line.price_data!.unit_amount).toBe(7800);
      expect(line.price_data!.product_data!.name).toBe("Glove");
      const meta = line.price_data!.product_data!.metadata as Record<
        string,
        string
      >;
      expect(meta.variantName).toBe("Pink");
      expect(meta.lineConfig).toMatch(/^L0-[0-9a-f]{16}$/);
      expect(meta.optionsSummary).toBe(
        "Chain: Silver · Charms: Bee, Star · Engraving: “Amy”",
      );
      expect(line.price_data!.product_data!.description).toBe(
        "Pink · Chain: Silver · Charms: Bee, Star · Engraving: “Amy”",
      );

      // Holds: the glove variant AND the linked Bee charm; the build is
      // stored in full on the reservation.
      const reservation = await db.inventoryReservation.findFirstOrThrow({
        where: { businessId: store.business.id },
      });
      expect(reservation.items as ReservationEntry[]).toEqual([
        { variantId: store.pink.id, qty: 1 },
        { variantId: store.bee.id, qty: 1 },
      ]);
      const configs = reservation.lineConfigs as StoredLineConfigs;
      const stored = configs[meta.lineConfig!]!;
      expect(stored.snapshot.basePrice).toBe(4000);
      expect(stored.snapshot.addOnTotal).toBe(3800);
      expect(stored.snapshot.components).toEqual([
        {
          productId: store.charm.id,
          variantId: store.bee.id,
          qtyPerUnit: 1,
          name: "Charm — Bee",
        },
      ]);
      expect(stored.selection.texts).toEqual([
        { groupId: store.engraving.id, text: "Amy" },
      ]);
      expect((await stockOf(store.bee.id)).reservedQty).toBe(1);
    });

    it("rejects a product with a required group posted without a build, echoing the lineKey", async () => {
      const store = await setupStore();
      const { res, body } = await startCheckout([
        { productId: store.glove.id, variantId: store.pink.id, lineKey: "k1" },
      ]);
      expect(res.status).toBe(400);
      expect(body.error).toBe(UNAVAILABLE_ERROR);
      expect(body.unavailableItemIds).toEqual([
        { productId: store.glove.id, variantId: store.pink.id, lineKey: "k1" },
      ]);
      expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
    });

    it("rejects unknown and other-tenant value ids", async () => {
      const store = await setupStore();
      const other = await createBusiness({ subdomain: "other-biz" });
      const foreign = await db.productOptionGroup.create({
        data: {
          businessId: other.id,
          name: "Charms",
          values: { create: [{ label: "Foreign", priceDelta: 0 }] },
        },
        include: { values: true },
      });

      for (const configuration of [
        build(store, { charms: ["does-not-exist"] }),
        build(store, { charms: [foreign.values[0]!.id] }),
        {
          choices: [{ groupId: foreign.id, valueIds: [foreign.values[0]!.id] }],
          texts: [],
        },
      ]) {
        const { res } = await startCheckout([
          {
            productId: store.glove.id,
            variantId: store.pink.id,
            configuration,
          },
        ]);
        expect(res.status).toBe(400);
      }
      expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
      expect(await db.inventoryReservation.count()).toBe(0);
    });

    it("rejects a configured line when the productOptions flag is off; a plain line still sells", async () => {
      const store = await setupStore({
        flags: { ...BASE_FLAGS, productOptions: false },
      });
      const configured = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          configuration: build(store),
        },
      ]);
      expect(configured.res.status).toBe(400);

      const plain = await startCheckout([
        { productId: store.glove.id, variantId: store.pink.id },
      ]);
      expect(plain.res.status).toBe(200);
      expect(plain.params!.line_items![0]!.price_data!.unit_amount).toBe(4000);
    });

    it("two configured lines can't oversell a shared charm; only the overdrawing line is rejected", async () => {
      const store = await setupStore({ beeQty: 1 });
      const { res, body } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          lineKey: "first",
          configuration: build(store, { charms: [store.beeValue.id] }),
        },
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          lineKey: "second",
          configuration: build(store, {
            charms: [store.beeValue.id, store.heartValue.id],
          }),
        },
      ]);
      expect(res.status).toBe(400);
      expect(body.unavailableItemIds).toEqual([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          lineKey: "second",
        },
      ]);
      expect((await stockOf(store.bee.id)).reservedQty).toBe(0);
      expect(await db.inventoryReservation.count()).toBe(0);
    });

    it("a configured line and a plain line of the same glove variant are summed", async () => {
      const store = await setupStore();
      await db.productVariant.update({
        where: { id: store.pink.id },
        data: { inventoryQty: 1 },
      });
      const { res, body } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          lineKey: "a",
          configuration: build(store),
        },
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          lineKey: "b",
          configuration: build(store, { engraving: "Bo" }),
        },
      ]);
      expect(res.status).toBe(400);
      expect(body.unavailableItemIds).toEqual([
        { productId: store.glove.id, variantId: store.pink.id, lineKey: "b" },
      ]);
    });

    it("a subscription checkout rejects a product with options", async () => {
      const store = await setupStore({
        flags: { ...BASE_FLAGS, subscriptions: true },
      });
      await db.product.update({
        where: { id: store.glove.id },
        data: {
          subscriptionEnabled: true,
          subscriptionIntervals: ["week:1"] as Prisma.InputJsonValue,
        },
      });
      const { POST } =
        await import("~/app/api/stripe/subscriptions/create-session/route");
      const host = `${SUBDOMAIN}.${PLATFORM_DOMAIN}`;
      const res = await POST(
        new Request(`https://${host}/api/stripe/subscriptions/create-session`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            host,
            "x-forwarded-for": "203.0.113.21",
          },
          body: JSON.stringify({
            productId: store.glove.id,
            variantId: store.pink.id,
            intervalKey: "week:1",
            quantity: 1,
            customerInfo: { email: "jane@shopper.test", name: "Jane Doe" },
            deliveryMethod: "pickup",
          }),
        }) as never,
      );
      const body = (await res.json()) as { error?: string };
      expect(res.status).toBe(400);
      expect(body.error).toMatch(/options to choose/);
    });
  });

  describe("webhook → order", () => {
    it("writes the snapshot onto the order item at Stripe's charged price and decrements the linked charm", async () => {
      const store = await setupStore();
      const { sessionId, params } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          configuration: build(store, {
            charms: [store.beeValue.id],
            engraving: "Amy",
          }),
        },
      ]);
      const order = await payCheckout(sessionId, params!);

      expect(order.items).toHaveLength(1);
      const item = order.items[0]!;
      expect(item.price).toBe(4000 + 1000 + 1500 + 500);
      expect(item.productName).toBe("Glove");
      expect(item.variantName).toBe("Pink");
      const snapshot = readCustomizationSnapshot(item.customization);
      expect(snapshot?.summary).toBe(
        "Chain: Silver · Charms: Bee · Engraving: “Amy”",
      );
      expect(snapshot?.components.map((c) => c.variantId)).toEqual([
        store.bee.id,
      ]);

      expect(await stockOf(store.bee.id)).toEqual({
        inventoryQty: 0,
        reservedQty: 0,
      });
      expect(await stockOf(store.pink.id)).toEqual({
        inventoryQty: 9,
        reservedQty: 0,
      });
      const sale = await db.inventoryHistory.findFirstOrThrow({
        where: { variantId: store.bee.id, reason: "sale" },
      });
      expect(sale.orderId).toBe(order.id);
      const reservation = await db.inventoryReservation.findFirstOrThrow({
        where: { stripeSessionId: sessionId },
      });
      expect(reservation.status).toBe("consumed");

      // Both emails print the build.
      const html = emailMocks.sendEmail.mock.calls
        .map(([args]) => JSON.stringify((args as { react: unknown }).react))
        .join("\n");
      expect(html).toContain("Engraving");
    });

    it("a delayed payment that settles after the hold was swept still gets the snapshot and deducts the charm", async () => {
      const store = await setupStore();
      const { sessionId, params } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          configuration: build(store, { charms: [store.beeValue.id] }),
        },
      ]);

      // Checkout completes "unpaid" (bank debit): hold extended, no order.
      const unpaid = echoSession(sessionId, params!, "unpaid");
      await postEvent(makeCheckoutCompletedEvent(unpaid.session, ACCOUNT_ID));
      expect(await db.order.count()).toBe(0);

      // No outcome for two weeks: the sweeper releases the hold.
      await db.inventoryReservation.updateMany({
        where: { stripeSessionId: sessionId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect(
        await sweepStaleReservations(db, { businessId: store.business.id }),
      ).toBe(1);
      expect((await stockOf(store.bee.id)).reservedQty).toBe(0);

      // The success arrives late.
      const paid = echoSession(sessionId, params!, "paid");
      stripeMocks.sessionsRetrieve.mockResolvedValue(paid.fullSession);
      await postEvent(
        makeCheckoutAsyncPaymentSucceededEvent(paid.session, ACCOUNT_ID),
      );

      const order = await db.order.findUniqueOrThrow({
        where: { stripeSessionId: sessionId },
        include: { items: true },
      });
      const snapshot = readCustomizationSnapshot(order.items[0]!.customization);
      expect(snapshot?.groups.map((g) => g.name)).toEqual(["Chain", "Charms"]);
      expect(snapshot?.components).toHaveLength(1);
      expect(await stockOf(store.bee.id)).toEqual({
        inventoryQty: 0,
        reservedQty: 0,
      });
    });

    it("falls back to a summary-only snapshot (no component deduction) when the stored build is gone", async () => {
      const store = await setupStore();
      const { sessionId, params } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          configuration: build(store, { charms: [store.beeValue.id] }),
        },
      ]);
      await db.inventoryReservation.updateMany({
        where: { stripeSessionId: sessionId },
        data: { lineConfigs: {} },
      });
      const order = await payCheckout(sessionId, params!);
      const snapshot = readCustomizationSnapshot(order.items[0]!.customization);
      expect(snapshot).toMatchObject({
        summary: "Chain: Silver · Charms: Bee",
        groups: [],
        components: [],
      });
      // The hold is still released; the charm itself is not deducted.
      expect(await stockOf(store.bee.id)).toEqual({
        inventoryQty: 1,
        reservedQty: 0,
      });
    });
  });

  describe("restock", () => {
    async function paidConfiguredOrder() {
      const store = await setupStore({ beeQty: 3 });
      const { sessionId, params } = await startCheckout([
        {
          productId: store.glove.id,
          variantId: store.pink.id,
          quantity: 2,
          configuration: build(store, { charms: [store.beeValue.id] }),
        },
      ]);
      const order = await payCheckout(sessionId, params!);
      expect(await stockOf(store.bee.id)).toEqual({
        inventoryQty: 1,
        reservedQty: 0,
      });
      expect((await stockOf(store.pink.id)).inventoryQty).toBe(8);
      const owner = await createOwnerUser(store.business.id);
      return { store, order, caller: createTestCaller({ userId: owner.id }) };
    }

    it("cancelling with restock returns the linked charms too", async () => {
      const { store, order, caller } = await paidConfiguredOrder();
      await caller.order.updateStatus({
        orderId: order.id,
        status: "cancelled",
        restockItems: true,
        sendEmail: false,
      });
      expect((await stockOf(store.bee.id)).inventoryQty).toBe(3);
      expect((await stockOf(store.pink.id)).inventoryQty).toBe(10);
      const returned = await db.inventoryHistory.findFirstOrThrow({
        where: { variantId: store.bee.id, reason: "return" },
      });
      expect(returned.changeQty).toBe(2);
    });

    it("a refund with restock returns the linked charms too", async () => {
      const { store, order, caller } = await paidConfiguredOrder();
      stripeMocks.refundsCreate.mockImplementation(
        async (p: { amount: number }) => ({
          id: "re_test",
          amount: p.amount,
          status: "succeeded",
          charge: "ch_test",
        }),
      );
      stripeMocks.chargesRetrieve.mockResolvedValue({
        amount_refunded: order.total,
      });
      await caller.order.refund({
        orderId: order.id,
        amount: order.total,
        restockItems: true,
        sendEmail: false,
      });
      expect((await stockOf(store.bee.id)).inventoryQty).toBe(3);
      expect((await stockOf(store.pink.id)).inventoryQty).toBe(10);
    });
  });

  describe("manual orders", () => {
    it("prices a posted build on the server and deducts its components when paid", async () => {
      const store = await setupStore();
      const owner = await createOwnerUser(store.business.id);
      const caller = createTestCaller({ userId: owner.id });
      const order = await caller.order.createManual({
        customerName: "Walk In",
        customerEmail: "walkin@test.dev",
        deliveryMethod: "pickup",
        items: [
          {
            productId: store.glove.id,
            productName: "Glove",
            productVariantId: store.pink.id,
            variantName: "Pink",
            quantity: 1,
            price: 3500, // admin-typed base (a verbal discount)
            configuration: build(store, { charms: [store.beeValue.id] }),
          },
        ],
        status: "open",
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
        sendConfirmationEmail: false,
      });
      expect(order.items[0]!.price).toBe(3500 + 1000 + 1500);
      expect(order.subtotal).toBe(6000);
      expect(
        readCustomizationSnapshot(order.items[0]!.customization)?.basePrice,
      ).toBe(3500);
      expect((await stockOf(store.bee.id)).inventoryQty).toBe(0);
    });

    it("rejects an invalid build", async () => {
      const store = await setupStore();
      const owner = await createOwnerUser(store.business.id);
      const caller = createTestCaller({ userId: owner.id });
      await expect(
        caller.order.createManual({
          customerName: "Walk In",
          customerEmail: "walkin@test.dev",
          deliveryMethod: "pickup",
          items: [
            {
              productId: store.glove.id,
              productName: "Glove",
              productVariantId: store.pink.id,
              quantity: 1,
              price: 4000,
              configuration: build(store, { chain: false, engraving: "x" }),
            },
          ],
          status: "open",
          paymentStatus: "paid",
          fulfillmentStatus: "unfulfilled",
          sendConfirmationEmail: false,
        }),
      ).rejects.toThrow(/chain/i);
    });
  });
});
