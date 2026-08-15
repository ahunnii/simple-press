import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestCaller } from "../helpers/caller";
import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createOrder,
  createOwnerUser,
  createProduct,
  createVariant,
} from "../helpers/factories";

// Procedures resolve the tenant from the request host via `next/headers` — see
// tenant-isolation.test.ts for the reference pattern.
const reqHost = vi.hoisted(() => ({ value: "refund-biz.simplepress.test" }));
vi.mock("next/headers", () => ({
  headers: () => Promise.resolve(new Headers({ host: reqHost.value })),
  cookies: () => Promise.resolve(new Headers()),
}));

// `order.refund` talks to Stripe directly (refunds.create + charges.retrieve).
// Mock the client so no real network call is ever made; each test can override
// the resolved values via `stripeMocks.*.mockResolvedValue(...)`.
const stripeMocks = vi.hoisted(() => ({
  refundsCreate: vi.fn(),
  chargesRetrieve: vi.fn(),
}));
vi.mock("~/lib/stripe/client", () => ({
  stripeClient: {
    refunds: {
      create: (...args: unknown[]): unknown =>
        stripeMocks.refundsCreate(...args),
    },
    charges: {
      retrieve: (...args: unknown[]): unknown =>
        stripeMocks.chargesRetrieve(...args),
    },
  },
}));

// Order mutations send transactional emails via Resend. Mock the whole
// templates module so refund/cancel tests never hit the network — the actual
// email copy is covered elsewhere; here we only care about the DB effects.
vi.mock("~/lib/email/templates", () => ({
  sendOrderCancelled: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmation: vi.fn().mockResolvedValue({ success: true }),
  sendOrderFulfilled: vi.fn().mockResolvedValue({ success: true }),
  sendOrderReadyForPickup: vi.fn().mockResolvedValue({ success: true }),
  sendOrderRefunded: vi.fn().mockResolvedValue({ success: true }),
  sendOrderShipped: vi.fn().mockResolvedValue({ success: true }),
}));

describe("order money correctness: refunds + cancellation restock", () => {
  beforeEach(async () => {
    await resetDb();
    reqHost.value = "refund-biz.simplepress.test";
    stripeMocks.refundsCreate.mockReset();
    stripeMocks.chargesRetrieve.mockReset();

    // Default refund echoes back the requested amount and a stable charge id.
    stripeMocks.refundsCreate.mockImplementation(
      async (params: { amount: number }) => ({
        id: "re_test",
        amount: params.amount,
        status: "succeeded",
        charge: "ch_test",
      }),
    );
    // Default charge read-back matches the single-refund case; tests that
    // refund more than once override this per-call.
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 0 });
  });

  async function setupBusiness() {
    const business = await createBusiness({ subdomain: "refund-biz" });
    const owner = await createOwnerUser(business.id);
    const caller = createTestCaller({ userId: owner.id });
    return { business, owner, caller };
  }

  // ── refund() ────────────────────────────────────────────────────────────

  it("partial refund sets refundAmountCents and leaves the order open/paid", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      paymentStatus: "paid",
      status: "open",
    });
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 3000 });

    const result = await caller.order.refund({
      orderId: order.id,
      amount: 3000,
      restockItems: false,
      sendEmail: false,
    });

    expect(result.success).toBe(true);
    expect(result.order.refundAmountCents).toBe(3000);
    expect(result.order.paymentStatus).toBe("paid");
    expect(result.order.status).toBe("open");

    const dbOrder = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(dbOrder.refundAmountCents).toBe(3000);
    expect(dbOrder.paymentStatus).toBe("paid");
  });

  it("full refund flips status and paymentStatus to refunded", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      paymentStatus: "paid",
      status: "open",
    });
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 10000 });

    const result = await caller.order.refund({
      orderId: order.id,
      amount: 10000,
      restockItems: false,
      sendEmail: false,
    });

    expect(result.order.status).toBe("refunded");
    expect(result.order.paymentStatus).toBe("refunded");
    expect(result.order.refundAmountCents).toBe(10000);
  });

  it("a second partial refund accumulates on top of the first (charge read-back wins)", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      paymentStatus: "paid",
      status: "open",
    });

    stripeMocks.chargesRetrieve.mockResolvedValueOnce({
      amount_refunded: 3000,
    });
    const first = await caller.order.refund({
      orderId: order.id,
      amount: 3000,
      restockItems: false,
      sendEmail: false,
    });
    expect(first.order.refundAmountCents).toBe(3000);

    stripeMocks.chargesRetrieve.mockResolvedValueOnce({
      amount_refunded: 5000,
    });
    const second = await caller.order.refund({
      orderId: order.id,
      amount: 2000,
      restockItems: false,
      sendEmail: false,
    });
    expect(second.order.refundAmountCents).toBe(5000);
    expect(second.order.paymentStatus).toBe("paid");
  });

  it("rejects a refund amount exceeding the remaining refundable amount", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      paymentStatus: "paid",
      status: "open",
      refundAmountCents: 4000, // 6000 remains refundable
    });

    await expect(
      caller.order.refund({
        orderId: order.id,
        amount: 7000,
        restockItems: false,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // The validation must short-circuit before ever calling Stripe.
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();

    const dbOrder = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(dbOrder.refundAmountCents).toBe(4000);
  });

  it("rejects refunding an order that is already fully refunded", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      paymentStatus: "refunded",
      status: "refunded",
      refundAmountCents: 10000,
    });

    await expect(
      caller.order.refund({
        orderId: order.id,
        amount: 100,
        restockItems: false,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
  });

  it("rejects a refund when the order has no Stripe payment intent (manual order)", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      total: 10000,
      subtotal: 10000,
      paymentStatus: "paid",
      status: "open",
      stripePaymentIntentId: null,
    });

    await expect(
      caller.order.refund({
        orderId: order.id,
        amount: 100,
        restockItems: false,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
  });

  it("restores product-level inventory on refund when restockItems is true", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, {
      trackInventory: true,
      inventoryQty: 5,
    });
    const order = await createOrder(business.id, {
      total: 2000,
      subtotal: 2000,
      paymentStatus: "paid",
      status: "open",
      items: [{ productId: product.id, quantity: 2, price: 1000, total: 2000 }],
    });
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 2000 });

    await caller.order.refund({
      orderId: order.id,
      amount: 2000,
      restockItems: true,
      sendEmail: false,
    });

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.inventoryQty).toBe(7);

    const history = await db.inventoryHistory.findMany({
      where: { productId: product.id, reason: "return" },
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.changeQty).toBe(2);
    expect(history[0]?.orderId).toBe(order.id);
  });

  it("does NOT restock inventory on refund when restockItems is false", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, {
      trackInventory: true,
      inventoryQty: 5,
    });
    const order = await createOrder(business.id, {
      total: 2000,
      subtotal: 2000,
      paymentStatus: "paid",
      status: "open",
      items: [{ productId: product.id, quantity: 2, price: 1000, total: 2000 }],
    });
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 2000 });

    await caller.order.refund({
      orderId: order.id,
      amount: 2000,
      restockItems: false,
      sendEmail: false,
    });

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.inventoryQty).toBe(5);

    const history = await db.inventoryHistory.findMany({
      where: { productId: product.id, reason: "return" },
    });
    expect(history).toHaveLength(0);
  });

  it("restores variant-level inventory on refund when restockItems is true", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, { trackInventory: true });
    const variant = await createVariant(product.id, { inventoryQty: 5 });
    const order = await createOrder(business.id, {
      total: 3000,
      subtotal: 3000,
      paymentStatus: "paid",
      status: "open",
      items: [
        {
          productId: product.id,
          productVariantId: variant.id,
          quantity: 3,
          price: 1000,
          total: 3000,
        },
      ],
    });
    stripeMocks.chargesRetrieve.mockResolvedValue({ amount_refunded: 3000 });

    await caller.order.refund({
      orderId: order.id,
      amount: 3000,
      restockItems: true,
      sendEmail: false,
    });

    const updatedVariant = await db.productVariant.findUniqueOrThrow({
      where: { id: variant.id },
    });
    expect(updatedVariant.inventoryQty).toBe(8);
  });

  // ── order.updateStatus cancellation restock ────────────────────────────

  it("updateStatus('cancelled') restocks inventory when it had been deducted (status was open)", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, {
      trackInventory: true,
      inventoryQty: 5,
    });
    const order = await createOrder(business.id, {
      status: "open",
      paymentStatus: "paid",
      total: 2000,
      subtotal: 2000,
      items: [{ productId: product.id, quantity: 2, price: 1000, total: 2000 }],
    });

    await caller.order.updateStatus({
      orderId: order.id,
      status: "cancelled",
      restockItems: true,
      sendEmail: false,
    });

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.inventoryQty).toBe(7);

    const dbOrder = await db.order.findUniqueOrThrow({
      where: { id: order.id },
    });
    expect(dbOrder.status).toBe("cancelled");
  });

  it("updateStatus('cancelled') does NOT restock when inventory was never deducted (order was already refunded)", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, {
      trackInventory: true,
      inventoryQty: 5,
    });
    const order = await createOrder(business.id, {
      status: "refunded",
      paymentStatus: "refunded",
      total: 2000,
      subtotal: 2000,
      items: [{ productId: product.id, quantity: 2, price: 1000, total: 2000 }],
    });

    await caller.order.updateStatus({
      orderId: order.id,
      status: "cancelled",
      restockItems: true,
      sendEmail: false,
    });

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.inventoryQty).toBe(5);

    const history = await db.inventoryHistory.findMany({
      where: { productId: product.id, reason: "return" },
    });
    expect(history).toHaveLength(0);
  });

  it("updateStatus('cancelled') does not restock when restockItems is false, even if inventory was deducted", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, {
      trackInventory: true,
      inventoryQty: 5,
    });
    const order = await createOrder(business.id, {
      status: "completed",
      paymentStatus: "paid",
      total: 2000,
      subtotal: 2000,
      items: [{ productId: product.id, quantity: 2, price: 1000, total: 2000 }],
    });

    await caller.order.updateStatus({
      orderId: order.id,
      status: "cancelled",
      restockItems: false,
      sendEmail: false,
    });

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.inventoryQty).toBe(5);
  });

  // ── markAsRefunded (manual, no Stripe call) ────────────────────────────

  it("markAsRefunded rejects an order that is already refunded", async () => {
    const { business, caller } = await setupBusiness();
    const order = await createOrder(business.id, {
      status: "refunded",
      paymentStatus: "refunded",
      total: 2000,
      subtotal: 2000,
    });

    await expect(
      caller.order.markAsRefunded({
        orderId: order.id,
        restockItems: false,
        sendEmail: false,
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("markAsRefunded sets the full order total as refunded and restocks when requested", async () => {
    const { business, caller } = await setupBusiness();
    const product = await createProduct(business.id, {
      trackInventory: true,
      inventoryQty: 5,
    });
    const order = await createOrder(business.id, {
      status: "open",
      paymentStatus: "paid",
      total: 2000,
      subtotal: 2000,
      items: [{ productId: product.id, quantity: 2, price: 1000, total: 2000 }],
    });

    const updated = await caller.order.markAsRefunded({
      orderId: order.id,
      restockItems: true,
      sendEmail: false,
    });

    expect(updated.status).toBe("refunded");
    expect(updated.paymentStatus).toBe("refunded");
    expect(updated.refundAmountCents).toBe(order.total);

    const updatedProduct = await db.product.findUniqueOrThrow({
      where: { id: product.id },
    });
    expect(updatedProduct.inventoryQty).toBe(7);
  });
});
