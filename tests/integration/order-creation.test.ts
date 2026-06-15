import type Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";

import { createOrderFromCheckout } from "~/lib/checkout/create-order";

import { db, resetDb } from "../helpers/db";
import {
  createBusiness,
  createCustomer,
  createProduct,
} from "../helpers/factories";

/**
 * Build a minimal fake Stripe.Checkout.Session.
 * Only the fields read by createOrderFromCheckout need to be populated.
 */
function makeSession(opts: {
  id?: string;
  customerName?: string;
  amountSubtotal?: number;
  amountTotal?: number;
  paymentStatus?: string;
  paymentIntent?: string | null;
  amountTax?: number;
  amountShipping?: number;
  lineItems?: Array<{
    description?: string;
    quantity?: number;
    unitAmount?: number;
    amountTotal?: number;
    productId?: string;
    productVariantId?: string;
  }>;
}): Stripe.Checkout.Session {
  const lineItemData = (opts.lineItems ?? []).map((li, i) => ({
    id: `li_${i}`,
    object: "item",
    description: li.description ?? "Test Product",
    quantity: li.quantity ?? 1,
    amount_total: li.amountTotal ?? (li.unitAmount ?? 1000) * (li.quantity ?? 1),
    price: {
      id: `price_${i}`,
      unit_amount: li.unitAmount ?? 1000,
      product: {
        id: `prod_stripe_${i}`,
        object: "product",
        metadata: {
          ...(li.productId ? { productId: li.productId } : {}),
          ...(li.productVariantId
            ? { productVariantId: li.productVariantId }
            : {}),
        },
      },
    },
  }));

  return {
    id: opts.id ?? `cs_test_${Date.now()}`,
    customer_details: {
      name: opts.customerName ?? "Jane Doe",
      email: null,
      phone: null,
      address: null,
      tax_ids: null,
      tax_exempt: "none",
    },
    amount_subtotal: opts.amountSubtotal ?? 1000,
    amount_total: opts.amountTotal ?? 1000,
    payment_status: opts.paymentStatus ?? "paid",
    payment_intent:
      opts.paymentIntent !== undefined ? opts.paymentIntent : `pi_test_${Date.now()}`,
    total_details: {
      amount_discount: 0,
      amount_shipping: opts.amountShipping ?? 0,
      amount_tax: opts.amountTax ?? 0,
      breakdown: null,
    },
    line_items: { data: lineItemData, has_more: false, object: "list", url: "" },
    metadata: {},
  } as unknown as Stripe.Checkout.Session;
}

describe("createOrderFromCheckout (integration)", () => {
  beforeEach(resetDb);

  it("creates an order with items and links customer + amounts correctly", async () => {
    const business = await createBusiness();
    const customer = await createCustomer(business.id, {
      email: "buyer@test.dev",
    });
    // Order items carry an FK to Product, so the metadata productIds must point
    // at real products (mirrors the webhook, where they come from product metadata).
    const product1 = await createProduct(business.id, {
      name: "Red Widget",
      price: 1000,
    });
    const product2 = await createProduct(business.id, {
      name: "Blue Gadget",
      price: 500,
    });

    const session = makeSession({
      id: "cs_test_abc123",
      customerName: "Jane Doe",
      amountSubtotal: 2500,
      amountTotal: 2700,
      amountTax: 200,
      amountShipping: 0,
      paymentStatus: "paid",
      paymentIntent: "pi_test_xyz",
      lineItems: [
        {
          description: "Red Widget",
          quantity: 2,
          unitAmount: 1000,
          amountTotal: 2000,
          productId: product1.id,
        },
        {
          description: "Blue Gadget",
          quantity: 1,
          unitAmount: 500,
          amountTotal: 500,
          productId: product2.id,
        },
      ],
    });

    const order = await createOrderFromCheckout(db, {
      business: { id: business.id },
      customer: { id: customer.id },
      shippingAddressId: null,
      customerEmail: "buyer@test.dev",
      session,
      fullSession: session,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    // Verify the order row
    expect(order.id).toBeTruthy();
    expect(order.businessId).toBe(business.id);
    expect(order.customerId).toBe(customer.id);
    expect(order.customerEmail).toBe("buyer@test.dev");
    expect(order.customerName).toBe("Jane Doe");
    expect(order.subtotal).toBe(2500);
    expect(order.total).toBe(2700);
    expect(order.tax).toBe(200);
    expect(order.shipping).toBe(0);
    expect(order.discount).toBe(0);
    expect(order.status).toBe("open");
    expect(order.paymentStatus).toBe("paid");
    expect(order.fulfillmentStatus).toBe("unfulfilled");
    expect(order.stripeSessionId).toBe("cs_test_abc123");
    expect(order.stripePaymentIntentId).toBe("pi_test_xyz");
    expect(order.discountCodeId).toBeNull();

    // Verify items were created
    expect(order.items).toHaveLength(2);

    const redWidget = order.items.find((i) => i.productName === "Red Widget");
    expect(redWidget).toBeTruthy();
    expect(redWidget?.quantity).toBe(2);
    expect(redWidget?.price).toBe(1000);
    expect(redWidget?.total).toBe(2000);
    expect(redWidget?.productId).toBe(product1.id);

    const blueGadget = order.items.find((i) => i.productName === "Blue Gadget");
    expect(blueGadget).toBeTruthy();
    expect(blueGadget?.quantity).toBe(1);
    expect(blueGadget?.price).toBe(500);

    // Confirm via a separate DB read (not just the return value)
    const dbOrder = await db.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { items: true },
    });
    expect(dbOrder.items).toHaveLength(2);
    expect(dbOrder.customerId).toBe(customer.id);
  });

  it("assigns orderNumber = 1 for the first order in a business", async () => {
    const business = await createBusiness();
    const session = makeSession({ id: "cs_first_order" });

    const order = await createOrderFromCheckout(db, {
      business: { id: business.id },
      customer: null,
      shippingAddressId: null,
      customerEmail: "guest@test.dev",
      session,
      fullSession: session,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    expect(order.orderNumber).toBe(1);
  });

  it("sequences orderNumber: second call produces orderNumber one higher than the first", async () => {
    const business = await createBusiness();

    const session1 = makeSession({ id: "cs_seq_1" });
    const order1 = await createOrderFromCheckout(db, {
      business: { id: business.id },
      customer: null,
      shippingAddressId: null,
      customerEmail: "buyer@test.dev",
      session: session1,
      fullSession: session1,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    const session2 = makeSession({ id: "cs_seq_2" });
    const order2 = await createOrderFromCheckout(db, {
      business: { id: business.id },
      customer: null,
      shippingAddressId: null,
      customerEmail: "buyer@test.dev",
      session: session2,
      fullSession: session2,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    expect(order2.orderNumber).toBe(order1.orderNumber + 1);
  });

  it("orderNumber sequences independently per business", async () => {
    const bizA = await createBusiness();
    const bizB = await createBusiness();

    const sessionA = makeSession({ id: "cs_biz_a" });
    const orderA = await createOrderFromCheckout(db, {
      business: { id: bizA.id },
      customer: null,
      shippingAddressId: null,
      customerEmail: "a@test.dev",
      session: sessionA,
      fullSession: sessionA,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    const sessionB = makeSession({ id: "cs_biz_b" });
    const orderB = await createOrderFromCheckout(db, {
      business: { id: bizB.id },
      customer: null,
      shippingAddressId: null,
      customerEmail: "b@test.dev",
      session: sessionB,
      fullSession: sessionB,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    // Both start at 1 — they're isolated
    expect(orderA.orderNumber).toBe(1);
    expect(orderB.orderNumber).toBe(1);
  });

  it("creates an order without a customer (guest checkout)", async () => {
    const business = await createBusiness();
    const session = makeSession({ id: "cs_guest" });

    const order = await createOrderFromCheckout(db, {
      business: { id: business.id },
      customer: null,
      shippingAddressId: null,
      customerEmail: "guest@test.dev",
      session,
      fullSession: session,
      verifiedDiscountCodeId: null,
      discountAmount: 0,
    });

    expect(order.customerId).toBeNull();
    expect(order.customerEmail).toBe("guest@test.dev");
  });
});
