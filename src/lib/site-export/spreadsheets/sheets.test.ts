import { describe, expect, it } from "vitest";

import type {
  CustomerSheetCustomer,
  EventSheetEvent,
  InvoiceSheetInvoice,
  OrderSheetOrder,
  ProductSheetProduct,
} from "./sheets";

import {
  collectionsSheet,
  customerAddressesSheet,
  customersSheet,
  discountsSheet,
  emailSubscribersSheet,
  eventsSheet,
  formatBillingAddress,
  formatCadence,
  formatInvoiceLabel,
  formatOptions,
  formatQuoteAnswers,
  invoiceLineItemsSheet,
  invoicePaymentsSheet,
  invoicesSheet,
  loyaltyHistorySheet,
  loyaltyMembersSheet,
  moderationStatus,
  orderItemsSheet,
  ordersSheet,
  PRODUCT_COLUMNS,
  productsSheet,
  quotesSheet,
  serviceItemsSheet,
  servicesSheet,
  shippingRatesSheet,
  subscriptionsSheet,
  testimonialsSheet,
} from "./sheets";

const ctx = { timeZone: "America/Detroit" };
const at = new Date(Date.UTC(2026, 0, 5, 14, 30)); // 09:30 Detroit

function product(over: Partial<ProductSheetProduct> = {}): ProductSheetProduct {
  return {
    name: "Mug",
    slug: "mug",
    excerpt: null,
    description: "<p>A <b>nice</b> mug</p>",
    price: 1800,
    compareAtPrice: null,
    cost: 700,
    sku: "MUG-1",
    barcode: null,
    trackInventory: true,
    inventoryQty: 12,
    allowBackorders: false,
    weight: null,
    weightUnit: "lb",
    published: true,
    scheduledPublishAt: null,
    featured: false,
    subscriptionEnabled: false,
    metaTitle: null,
    metaDescription: null,
    createdAt: at,
    baseInventoryUnit: null,
    images: [
      { url: "https://img/b.jpg", sortOrder: 1 },
      { url: "https://img/a.jpg", sortOrder: 0 },
    ],
    variants: [],
    collectionProducts: [
      { collection: { name: "Kitchen" } },
      { collection: { name: "Gifts" } },
    ],
    ...over,
  };
}

describe("productsSheet", () => {
  it("emits one row for a product with no variants", () => {
    const { columns, rows } = productsSheet([product()], ctx);
    expect(columns).toEqual(PRODUCT_COLUMNS);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      "Product name": "Mug",
      Status: "Published",
      Price: "18.00",
      "Compare-at price": "",
      Cost: "7.00",
      SKU: "MUG-1",
      Stock: 12,
      Description: "A nice mug",
      "Image URLs": "https://img/a.jpg | https://img/b.jpg",
      Collections: "Kitchen; Gifts",
      Featured: "No",
      Created: "2026-01-05 09:30",
    });
  });

  it("lists attached option groups in order on the first row only", () => {
    const { rows } = productsSheet(
      [
        product({
          optionGroups: [
            { sortOrder: 2, group: { name: "Engraving", adminLabel: null } },
            {
              sortOrder: 1,
              group: { name: "Charms", adminLabel: "Glove charms" },
            },
          ],
          variants: [
            {
              name: "Small",
              sku: null,
              barcode: null,
              price: null,
              compareAtPrice: null,
              inventoryQty: 1,
              options: {},
              imageUrl: null,
            },
            {
              name: "Large",
              sku: null,
              barcode: null,
              price: null,
              compareAtPrice: null,
              inventoryQty: 1,
              options: {},
              imageUrl: null,
            },
          ],
        }),
      ],
      ctx,
    );
    expect(rows[0]?.["Option groups"]).toBe("Charms (Glove charms); Engraving");
    expect(rows[1]?.["Option groups"]).toBe("");
  });

  it("leaves Option groups blank when none are attached", () => {
    const { rows } = productsSheet([product()], ctx);
    expect(rows[0]?.["Option groups"]).toBe("");
  });

  it("expands one row per variant, with heavy cells on the first row only", () => {
    const { rows } = productsSheet(
      [
        product({
          price: 2000,
          compareAtPrice: 2500,
          variants: [
            {
              name: "Small",
              sku: "S",
              barcode: null,
              price: null,
              compareAtPrice: null,
              inventoryQty: 3,
              options: { size: "Small", color: "Red" },
              imageUrl: null,
            },
            {
              name: "Large",
              sku: "L",
              barcode: "123",
              price: 2400,
              compareAtPrice: null,
              inventoryQty: 0,
              options: { size: "Large" },
              imageUrl: "https://img/l.jpg",
            },
          ],
        }),
      ],
      ctx,
    );
    expect(rows).toHaveLength(2);
    const [small, large] = rows;
    // Variant without its own price inherits product price + compare-at.
    expect(small).toMatchObject({
      Variant: "Small",
      Options: "size: Small; color: Red",
      Price: "20.00",
      "Compare-at price": "25.00",
      SKU: "S",
      Stock: 3,
      Description: "A nice mug",
      Collections: "Kitchen; Gifts",
    });
    // A variant with its own price does not inherit the product's compare-at.
    expect(large).toMatchObject({
      "Product name": "Mug",
      Variant: "Large",
      Price: "24.00",
      "Compare-at price": "",
      Barcode: "123",
      Stock: 0,
      "Variant image URL": "https://img/l.jpg",
      Description: "",
      "Image URLs": "",
      Collections: "",
    });
  });

  it("leaves stock blank when inventory is untracked or pooled", () => {
    const untracked = productsSheet([product({ trackInventory: false })], ctx);
    expect(untracked.rows[0]?.Stock).toBe("");
    const pooled = productsSheet(
      [product({ baseInventoryUnit: { name: "Clay blanks" } })],
      ctx,
    );
    expect(pooled.rows[0]).toMatchObject({
      Stock: "",
      "Shared inventory item": "Clay blanks",
    });
  });

  it("labels drafts and scheduled products", () => {
    const draft = productsSheet([product({ published: false })], ctx);
    expect(draft.rows[0]?.Status).toBe("Draft");
    const scheduled = productsSheet(
      [product({ published: false, scheduledPublishAt: at })],
      ctx,
    );
    expect(scheduled.rows[0]?.Status).toBe("Scheduled");
  });

  it("produces a header-only sheet with no products", () => {
    expect(productsSheet([], ctx).rows).toEqual([]);
  });
});

describe("formatOptions", () => {
  it("handles junk safely", () => {
    expect(formatOptions(null)).toBe("");
    expect(formatOptions(["a"])).toBe("");
    expect(formatOptions({ a: "", b: null, c: { x: 1 }, d: 2 })).toBe("d: 2");
  });
});

describe("collectionsSheet", () => {
  it("lists products in order with a count", () => {
    const { rows } = collectionsSheet([
      {
        name: "Gifts",
        slug: "gifts",
        description: "<p>Presents</p>",
        imageUrl: null,
        published: false,
        sortOrder: 0,
        metaTitle: null,
        metaDescription: null,
        collectionProducts: [
          { sortOrder: 2, product: { name: "B" } },
          { sortOrder: 1, product: { name: "A" } },
        ],
      },
    ]);
    expect(rows[0]).toMatchObject({
      Status: "Draft",
      Description: "Presents",
      "Number of products": 2,
      Products: "A; B",
    });
  });
});

const customer: CustomerSheetCustomer = {
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Doe",
  phone: "+15551234567",
  acceptsMarketing: true,
  totalSpent: 12345,
  orderCount: 3,
  notes: null,
  createdAt: at,
  userId: null,
  loyaltyPoints: 40,
  loyaltyJoinedAt: at,
  birthMonth: 3,
  birthDay: 14,
  anonymizedAt: null,
  deletionRequestedAt: null,
  shippingAddresses: [
    {
      firstName: "Jane",
      lastName: "Doe",
      company: null,
      address1: "1 Main St",
      address2: "Apt 2",
      city: "Saginaw",
      province: "MI",
      zip: "48601",
      country: "US",
      phone: null,
      isDefault: true,
    },
  ],
};

describe("customers", () => {
  it("includes guests, accounts and rewards members with friendly values", () => {
    const guest = {
      ...customer,
      email: "guest@example.com",
      userId: null,
      loyaltyJoinedAt: null,
    };
    const account = { ...customer, email: "acct@example.com", userId: "u1" };
    const { rows } = customersSheet([guest, account], ctx);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      Email: "guest@example.com",
      "Total spent": "123.45",
      "Accepts marketing emails": "Yes",
      "Has an online account": "No",
      "Rewards member": "No",
      "Customer since": "2026-01-05 09:30",
    });
    expect(rows[1]?.["Has an online account"]).toBe("Yes");
  });

  it("flattens addresses and skips customers without any", () => {
    const { rows } = customerAddressesSheet([
      customer,
      { ...customer, email: "none@example.com", shippingAddresses: [] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      "Customer email": "jane@example.com",
      "Address line 1": "1 Main St",
      "Default address": "Yes",
    });
  });
});

const order: OrderSheetOrder = {
  orderNumber: 1001,
  createdAt: at,
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  customerPhone: null,
  status: "completed",
  paymentStatus: "paid",
  fulfillmentStatus: "partially_fulfilled",
  deliveryMethod: "ship",
  paymentMethod: "card",
  subtotal: 5000,
  shipping: 500,
  tax: 300,
  discount: 1000,
  total: 4800,
  refundAmountCents: null,
  refundReason: null,
  customerNote: null,
  internalNote: null,
  stripePaymentIntentId: "pi_1",
  discountCode: { code: "SAVE10" },
  items: [
    {
      productName: "Widget",
      variantName: "Blue",
      sku: "W-B",
      price: 2500,
      quantity: 2,
      total: 5000,
      fulfilledQuantity: 1,
    },
  ],
  shippingAddress: {
    firstName: "Jane",
    lastName: "Doe",
    address1: "1 Main St",
    address2: null,
    city: "Saginaw",
    province: "MI",
    zip: "48601",
    country: "US",
  },
  shipments: [{ carrier: "USPS", trackingNumber: "940" }],
};

describe("orders", () => {
  it("formats money as dollars and statuses as words", () => {
    const { rows } = ordersSheet([order], ctx);
    expect(rows[0]).toMatchObject({
      "Order number": 1001,
      "Order date": "2026-01-05 09:30",
      "Fulfillment status": "Partially fulfilled",
      "Items subtotal": "50.00",
      Shipping: "5.00",
      Discount: "10.00",
      Total: "48.00",
      Refunded: "0.00",
      "Discount code": "SAVE10",
      "Number of items": 2,
      Items: "2 x Widget (Blue)",
      "Ship to name": "Jane Doe",
      "Ship to address": "1 Main St",
      Tracking: "USPS 940",
    });
  });

  it("flattens line items", () => {
    const { rows } = orderItemsSheet(
      [order, { ...order, orderNumber: 1002, items: [] }],
      ctx,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      "Order number": 1001,
      "Unit price": "25.00",
      "Line total": "50.00",
      "Quantity shipped": 1,
    });
  });

  it("lists product-customizer choices in an Options column and leaves plain lines blank", () => {
    const customization = {
      v: 1,
      basePrice: 5000,
      addOnTotal: 1700,
      summary: "Charms: Star, Moon; Engraving: AB",
      groups: [
        {
          groupId: "g1",
          name: "Charms",
          kind: "choice",
          selections: [
            {
              valueId: "v1",
              label: "Star",
              imageUrl: null,
              swatchColor: null,
              price: 0,
              included: true,
              linkedProductId: null,
              linkedVariantId: null,
              sku: null,
            },
            {
              valueId: "v2",
              label: "Moon",
              imageUrl: null,
              swatchColor: null,
              price: 1200,
              included: false,
              linkedProductId: null,
              linkedVariantId: null,
              sku: null,
            },
          ],
        },
        {
          groupId: "g2",
          name: "Engraving",
          kind: "text",
          text: "AB",
          price: 500,
        },
      ],
      components: [],
    };
    const { columns, rows } = orderItemsSheet(
      [
        {
          ...order,
          items: [
            { ...order.items[0]!, customization },
            { ...order.items[0]!, customization: null },
            order.items[0]!,
          ],
        },
      ],
      ctx,
    );
    expect(columns).toContain("Options");
    expect(rows[0]?.Options).toBe(
      "Charms: Star (included), Moon; Engraving: “AB”",
    );
    expect(rows[1]?.Options).toBe("");
    expect(rows[2]?.Options).toBe("");
  });

  it("keeps a header for a store with no orders", () => {
    const sheet = ordersSheet([], ctx);
    expect(sheet.rows).toEqual([]);
    expect(sheet.columns).toContain("Order number");
  });
});

describe("discounts", () => {
  it("shows percent and dollar discounts differently", () => {
    const base = {
      active: true,
      source: "manual",
      usageLimit: null,
      usageCount: 2,
      perCustomerLimit: 1,
      startsAt: null,
      expiresAt: at,
      minPurchase: 2500,
      maxDiscount: null,
    };
    const { rows } = discountsSheet(
      [
        { ...base, code: "TEN", type: "percentage", value: 10 },
        { ...base, code: "FIVE", type: "fixed", value: 500, source: "loyalty" },
      ],
      ctx,
    );
    expect(rows[0]).toMatchObject({
      Type: "Percent off",
      "Amount off": "10%",
      "Total uses allowed": "Unlimited",
      "Uses allowed per customer": 1,
      Expires: "2026-01-05 09:30",
      "Minimum purchase": "25.00",
      "Created by": "You",
    });
    expect(rows[1]).toMatchObject({
      Type: "Dollar amount off",
      "Amount off": "5.00",
      "Created by": "Rewards redemption",
    });
  });
});

describe("moderation + testimonials", () => {
  it("derives a status from the two moderation flags", () => {
    expect(moderationStatus({ isApproved: false, isHidden: false })).toBe(
      "Waiting for approval",
    );
    expect(moderationStatus({ isApproved: true, isHidden: false })).toBe(
      "Published",
    );
    expect(moderationStatus({ isApproved: true, isHidden: true })).toBe(
      "Hidden",
    );
  });

  it("maps testimonials", () => {
    const { rows } = testimonialsSheet(
      [
        {
          title: null,
          text: "Great!",
          photoUrls: ["u1", "u2"],
          isApproved: true,
          isHidden: false,
          source: "owner",
          customerName: "Sam",
          customerEmail: null,
          customerTitle: "CEO",
          customerCompany: "Acme",
          testimonialDate: at,
        },
      ],
      ctx,
    );
    expect(rows[0]).toMatchObject({
      Name: "Sam",
      Status: "Published",
      "Written by": "You",
      Date: "2026-01-05",
      "Photo URLs": "u1 | u2",
    });
  });
});

const invoice: InvoiceSheetInvoice = {
  invoiceNumber: 12,
  numberPrefix: "INV-",
  status: "PARTIALLY_PAID",
  customerName: "Acme",
  customerEmail: "ap@acme.test",
  customerPhone: null,
  billingAddress: JSON.stringify({
    line1: "9 Oak",
    city: "Flint",
    state: "MI",
    zip: "48502",
  }),
  currency: "usd",
  lineItems: JSON.stringify([
    { id: "a", description: "Design", quantity: 1.5, unitPriceCents: 10000 },
    { id: "b", description: "Hosting", quantity: 2, unitPriceCents: 999 },
    { bad: true },
  ]),
  subtotalCents: 16998,
  discountCents: 0,
  taxRateBps: 625,
  taxCents: 1062,
  totalCents: 18060,
  amountPaidCents: 5000,
  issueDate: new Date(Date.UTC(2026, 2, 1)),
  dueDate: new Date(Date.UTC(2026, 2, 31)),
  notes: null,
  terms: null,
  sentAt: at,
  paidAt: null,
  cancelledAt: null,
  cancelReason: null,
  createdAt: at,
  payments: [
    {
      amountCents: 5000,
      paidOn: new Date(Date.UTC(2026, 2, 5)),
      method: "cash_check",
      reference: "#101",
      note: null,
      createdAt: at,
    },
  ],
};

describe("invoices", () => {
  it("formats numbers, calendar dates and balances", () => {
    expect(formatInvoiceLabel(invoice, 4)).toBe("INV-0012");
    const { rows } = invoicesSheet([invoice], { ...ctx, numberPadding: 4 });
    expect(rows[0]).toMatchObject({
      "Invoice number": "INV-0012",
      Status: "Partially paid",
      "Billing address": "9 Oak, Flint, MI 48502",
      "Issue date": "2026-03-01",
      "Due date": "2026-03-31",
      "Tax rate (%)": "6.25",
      Total: "180.60",
      "Amount paid": "50.00",
      "Balance due": "130.60",
      Currency: "USD",
    });
  });

  it("expands line items (dropping malformed ones) and payments", () => {
    const lines = invoiceLineItemsSheet([invoice], { numberPadding: 4 }).rows;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({
      Quantity: 1.5,
      "Unit price": "100.00",
      "Line total": "150.00",
    });
    expect(lines[1]?.["Line total"]).toBe("19.98");

    const payments = invoicePaymentsSheet([invoice], {
      ...ctx,
      numberPadding: 4,
    }).rows;
    expect(payments[0]).toMatchObject({
      "Invoice number": "INV-0012",
      "Date paid": "2026-03-05",
      Amount: "50.00",
      Method: "Cash or check",
      Reference: "#101",
    });
  });

  it("tolerates unreadable billing JSON", () => {
    expect(formatBillingAddress("{nope")).toBe("");
    expect(formatBillingAddress(null)).toBe("");
  });
});

describe("quotes", () => {
  it("lists only visible answers", () => {
    expect(
      formatQuoteAnswers([
        { title: "Bedrooms", display: "3-4", hidden: false },
        { title: "Stairs", display: "Yes", hidden: true },
      ]),
    ).toBe("Bedrooms: 3-4");
    expect(formatQuoteAnswers("nope")).toBe("");
  });

  it("maps a submission", () => {
    const { rows } = quotesSheet(
      [
        {
          createdAt: at,
          status: "NEW",
          calculatorName: "Moving",
          contactName: "Pat",
          contactEmail: "pat@x.test",
          contactPhone: null,
          answers: [],
          estimateCents: 326400,
          finalQuoteCents: null,
          quoteSentAt: null,
          sentQuoteCents: null,
        },
      ],
      ctx,
    );
    expect(rows[0]).toMatchObject({
      Status: "New",
      "Automatic estimate": "3264.00",
      "Your final quote": "",
    });
  });
});

describe("rewards", () => {
  it("maps members and ledger rows", () => {
    const members = loyaltyMembersSheet([customer], ctx).rows;
    expect(members[0]).toMatchObject({
      "Points balance": 40,
      "Joined rewards": "2026-01-05",
      Birthday: "March 14",
    });
    const history = loyaltyHistorySheet(
      [
        {
          createdAt: at,
          type: "order_earn",
          points: 50,
          balanceAfter: 90,
          reason: null,
          customer: {
            email: "jane@example.com",
            firstName: "Jane",
            lastName: "Doe",
          },
          order: { orderNumber: 1001 },
        },
      ],
      ctx,
    ).rows;
    expect(history[0]).toMatchObject({
      "What happened": "Earned on an order",
      Points: 50,
      "Customer name": "Jane Doe",
      "Order number": 1001,
    });
  });
});

describe("subscriptions", () => {
  it("describes cadence", () => {
    expect(formatCadence("week", 1)).toBe("Every week");
    expect(formatCadence("month", 2)).toBe("Every 2 months");
  });

  it("omits the address for pickup", () => {
    const { rows } = subscriptionsSheet(
      [
        {
          createdAt: at,
          customerEmail: "a@b.test",
          customerName: null,
          customerPhone: null,
          productName: "Coffee",
          variantName: null,
          sku: null,
          quantity: 1,
          interval: "month",
          intervalCount: 1,
          listPriceCents: 2000,
          discountPercent: 10,
          unitAmountCents: 1800,
          shippingCents: 0,
          deliveryMethod: "pickup",
          shipFirstName: "A",
          shipLastName: "B",
          shipAddress1: "1 St",
          shipAddress2: null,
          shipCity: "X",
          shipProvince: null,
          shipZip: "1",
          shipCountry: "US",
          status: "active",
          nextBillingAt: at,
          pauseResumesAt: null,
          cancelledAt: null,
          cancelReason: null,
          stripeSubscriptionId: "sub_1",
        },
      ],
      ctx,
    );
    expect(rows[0]).toMatchObject({
      Repeats: "Every month",
      "Price each (locked)": "18.00",
      "Ship to": "",
      "Next billing": "2026-01-05 09:30",
    });
  });
});

describe("email subscribers", () => {
  it("uses friendly money", () => {
    const { rows } = emailSubscribersSheet(
      [
        {
          email: "a@b.test",
          firstName: null,
          lastName: null,
          orderCount: 2,
          totalSpent: 999,
          createdAt: at,
        },
      ],
      ctx,
    );
    expect(rows[0]).toMatchObject({
      "Total spent": "9.99",
      "Number of orders": 2,
    });
  });
});

describe("services and events", () => {
  const service = {
    name: "Massage",
    slug: "massage",
    description: null,
    image: null,
    published: true,
    sortOrder: 0,
    metaTitle: null,
    metaDescription: null,
    items: [
      {
        name: "60 min",
        description: null,
        priceLabel: "$90",
        durationLabel: "1 hr",
        compareAtPriceLabel: null,
        image: null,
        bookingEmbedSrc: null,
        isSignature: true,
        published: true,
        sortOrder: 0,
      },
    ],
  };

  it("summarizes offerings and lists them individually", () => {
    expect(servicesSheet([service]).rows[0]).toMatchObject({
      "Number of offerings": 1,
      Offerings: "60 min - $90, 1 hr",
    });
    expect(serviceItemsSheet([service]).rows[0]).toMatchObject({
      Service: "Massage",
      Offering: "60 min",
      "Signature offering": "Yes",
    });
  });

  it("shows only dates for all-day events", () => {
    const event: EventSheetEvent = {
      name: "Market",
      slug: "market",
      blurb: null,
      coverImage: null,
      coverVideo: null,
      startAt: new Date(Date.UTC(2026, 5, 6, 4, 0)), // 00:00 Detroit
      endAt: new Date(Date.UTC(2026, 5, 7, 3, 59)),
      allDay: true,
      location: "Park",
      externalUrl: null,
      externalUrlLabel: null,
      priceLabel: "Free",
      published: true,
      isArchived: true,
    };
    expect(eventsSheet([event], ctx).rows[0]).toMatchObject({
      Starts: "2026-06-06",
      Ends: "2026-06-06",
      "All day": "Yes",
      Status: "Past (archived)",
    });
    const timed = eventsSheet([{ ...event, allDay: false }], ctx).rows[0];
    expect(timed?.Starts).toBe("2026-06-06 00:00");
  });
});

describe("shipping rates", () => {
  it("expands zones x weight tiers and the fallback", () => {
    const { rows } = shippingRatesSheet({
      shippingType: "zone_weight",
      shippingFlatRate: null,
      freeShippingThreshold: null,
      shippingFallbackRate: 1500,
      weightTiers: [
        { label: "Light", minLb: 0, maxLb: 1 },
        { label: "Heavy", minLb: 1, maxLb: null },
      ],
      zones: [
        {
          name: "Zone 1",
          states: ["MI", "OH"],
          sortOrder: 0,
          rates: [
            { tierIndex: 1, priceCents: 900 },
            { tierIndex: 0, priceCents: 500 },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      "Shipping zone": "Zone 1",
      States: "MI, OH",
      "Package weight": "Light (0-1 lb)",
      "Shipping price": "5.00",
    });
    expect(rows[1]?.["Package weight"]).toBe("Heavy (1 lb and up)");
    expect(rows[2]).toMatchObject({
      "Shipping zone": "Anywhere else",
      "Shipping price": "15.00",
    });
  });

  it("describes a flat rate with a free-shipping threshold", () => {
    const { rows } = shippingRatesSheet({
      shippingType: "flat_rate_with_threshold",
      shippingFlatRate: 700,
      freeShippingThreshold: 5000,
      shippingFallbackRate: null,
      weightTiers: [],
      zones: [],
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.["Shipping price"]).toBe("7.00");
    expect(rows[1]?.["Package weight"]).toBe(
      "Free when the order is 50.00 or more",
    );
  });

  it("is empty when shipping is free", () => {
    expect(
      shippingRatesSheet({
        shippingType: "free",
        shippingFlatRate: null,
        freeShippingThreshold: null,
        shippingFallbackRate: null,
        weightTiers: [],
        zones: [],
      }).rows,
    ).toEqual([]);
  });
});
